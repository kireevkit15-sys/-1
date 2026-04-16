import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UserConceptMastery } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────

export type InteractionType =
  | 'quiz_correct'
  | 'quiz_wrong'
  | 'explain_understood'
  | 'explain_partial'
  | 'explain_missed'
  | 'barrier_pass'
  | 'barrier_fail';

export interface InteractionResult {
  type: InteractionType;
  conceptId: string;
  timeSpentMs?: number;
}

export interface ConceptReview {
  conceptId: string;
  conceptSlug: string;
  conceptName: string;
  branch: string;
  mastery: number;
  bloomReached: number;
  nextReviewAt: Date;
  timesCorrect: number;
  timesWrong: number;
}

export interface LearningVelocity {
  conceptsMastered: number; // mastery >= 0.8
  conceptsInProgress: number; // 0 < mastery < 0.8
  averageMastery: number;
  velocityPerDay: number; // concepts mastered per day over last 7 days
  totalDaysActive: number;
}

export interface BranchMastery {
  branch: string;
  totalConcepts: number;
  masteredConcepts: number; // mastery >= 0.8
  averageMastery: number;
  averageBloom: number;
}

// ── SRS Constants ────────────────────────────────────────────────────────

/** Base intervals in days for spaced repetition (SM-2 inspired) */
const BASE_INTERVALS = [1, 3, 7, 14, 30] as const;

/** Mastery deltas per interaction type */
const MASTERY_DELTAS: Record<InteractionType, number> = {
  quiz_correct: 0.1,
  quiz_wrong: -0.05,
  explain_understood: 0.15,
  explain_partial: 0.05,
  explain_missed: -0.03,
  barrier_pass: 0.2,
  barrier_fail: -0.1,
};

/** Bloom level increments per interaction type */
const BLOOM_DELTAS: Record<InteractionType, number> = {
  quiz_correct: 0,
  quiz_wrong: 0,
  explain_understood: 1,
  explain_partial: 0,
  explain_missed: 0,
  barrier_pass: 1,
  barrier_fail: 0,
};

/** Whether interaction counts as correct or wrong */
const CORRECT_TYPES = new Set<InteractionType>([
  'quiz_correct',
  'explain_understood',
  'barrier_pass',
]);
const WRONG_TYPES = new Set<InteractionType>([
  'quiz_wrong',
  'explain_missed',
  'barrier_fail',
]);

// ── Service ──────────────────────────────────────────────────────────────

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a concept interaction and update mastery + SRS scheduling.
   */
  async recordInteraction(
    userId: string,
    conceptId: string,
    result: InteractionResult,
  ): Promise<UserConceptMastery> {
    const existing = await this.prisma.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    const currentMastery = existing?.mastery ?? 0;
    const currentTimesCorrect = existing?.timesCorrect ?? 0;
    const currentTimesWrong = existing?.timesWrong ?? 0;

    const masteryDelta = MASTERY_DELTAS[result.type];
    const bloomDelta = BLOOM_DELTAS[result.type];
    const isCorrect = CORRECT_TYPES.has(result.type);
    const isWrong = WRONG_TYPES.has(result.type);

    const newMastery = Math.max(0, Math.min(1, currentMastery + masteryDelta));
    const newTimesCorrect = currentTimesCorrect + (isCorrect ? 1 : 0);
    const newTimesWrong = currentTimesWrong + (isWrong ? 1 : 0);

    const nextReviewAt = this.calculateNextReview(
      newMastery,
      newTimesCorrect,
      newTimesWrong,
    );

    const now = new Date();

    const mastery = await this.prisma.userConceptMastery.upsert({
      where: { userId_conceptId: { userId, conceptId } },
      update: {
        mastery: newMastery,
        bloomReached: bloomDelta > 0
          ? { increment: bloomDelta }
          : undefined,
        timesCorrect: isCorrect ? { increment: 1 } : undefined,
        timesWrong: isWrong ? { increment: 1 } : undefined,
        lastTestedAt: now,
        nextReviewAt,
      },
      create: {
        userId,
        conceptId,
        mastery: Math.max(0, masteryDelta),
        bloomReached: Math.max(0, bloomDelta),
        timesCorrect: isCorrect ? 1 : 0,
        timesWrong: isWrong ? 1 : 0,
        lastTestedAt: now,
        nextReviewAt,
      },
    });

    // Record time if provided
    if (result.timeSpentMs != null && result.timeSpentMs > 0) {
      await this.recordCardTime(userId, conceptId, result.type, result.timeSpentMs);
    }

    return mastery;
  }

  /**
   * SM-2 inspired algorithm: calculate next review date.
   *
   * - Base intervals: [1, 3, 7, 14, 30] days
   * - Interval index = timesCorrect (capped at 4)
   * - mastery >= 0.8 → advance to next interval
   * - mastery >= 0.5 → stay at current interval
   * - mastery < 0.5  → reset to 1 day
   * - Jitter: +/-10% to prevent clustering
   */
  calculateNextReview(
    mastery: number,
    timesCorrect: number,
    timesWrong: number,
  ): Date {
    let intervalDays: number;

    if (mastery < 0.5) {
      // Struggling — review tomorrow
      intervalDays = BASE_INTERVALS[0];
    } else {
      const index = Math.min(timesCorrect, BASE_INTERVALS.length - 1);

      if (mastery >= 0.8) {
        // Strong — advance to next interval
        const advancedIndex = Math.min(index + 1, BASE_INTERVALS.length - 1);
        intervalDays = BASE_INTERVALS[advancedIndex];
      } else {
        // Moderate — stay at current interval
        intervalDays = BASE_INTERVALS[index];
      }
    }

    // Factor in error rate: more wrong answers → shorter intervals
    const totalAttempts = timesCorrect + timesWrong;
    if (totalAttempts > 0) {
      const errorRate = timesWrong / totalAttempts;
      // Reduce interval by up to 30% based on error rate
      intervalDays = intervalDays * (1 - errorRate * 0.3);
    }

    // Add jitter: +/-10%
    const jitterFactor = 0.9 + Math.random() * 0.2;
    intervalDays = Math.max(1, intervalDays * jitterFactor);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.round(intervalDays));
    nextReview.setHours(6, 0, 0, 0); // Schedule for 6 AM
    return nextReview;
  }

  /**
   * Get concepts due for review (nextReviewAt <= now).
   */
  async getDueForReview(
    userId: string,
    limit = 20,
  ): Promise<ConceptReview[]> {
    const now = new Date();

    const records = await this.prisma.userConceptMastery.findMany({
      where: {
        userId,
        nextReviewAt: { lte: now },
      },
      orderBy: [
        { nextReviewAt: 'asc' }, // Most overdue first
        { mastery: 'asc' },      // Weakest concepts first
      ],
      take: limit,
      include: {
        concept: {
          select: {
            id: true,
            slug: true,
            nameRu: true,
            branch: true,
          },
        },
      },
    });

    return records.map((r) => ({
      conceptId: r.concept.id,
      conceptSlug: r.concept.slug,
      conceptName: r.concept.nameRu,
      branch: r.concept.branch,
      mastery: r.mastery,
      bloomReached: r.bloomReached,
      nextReviewAt: r.nextReviewAt!,
      timesCorrect: r.timesCorrect,
      timesWrong: r.timesWrong,
    }));
  }

  /**
   * Calculate learning velocity — concepts mastered per day.
   */
  async getLearningVelocity(userId: string): Promise<LearningVelocity> {
    const allMastery = await this.prisma.userConceptMastery.findMany({
      where: { userId },
      select: {
        mastery: true,
        lastTestedAt: true,
      },
    });

    if (allMastery.length === 0) {
      return {
        conceptsMastered: 0,
        conceptsInProgress: 0,
        averageMastery: 0,
        velocityPerDay: 0,
        totalDaysActive: 0,
      };
    }

    const conceptsMastered = allMastery.filter((m) => m.mastery >= 0.8).length;
    const conceptsInProgress = allMastery.filter(
      (m) => m.mastery > 0 && m.mastery < 0.8,
    ).length;
    const averageMastery =
      allMastery.reduce((sum, m) => sum + m.mastery, 0) / allMastery.length;

    // Calculate velocity over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMastered = await this.prisma.userConceptMastery.count({
      where: {
        userId,
        mastery: { gte: 0.8 },
        lastTestedAt: { gte: sevenDaysAgo },
      },
    });

    // Count distinct active days
    const testedDates = allMastery
      .filter((m) => m.lastTestedAt != null)
      .map((m) => m.lastTestedAt!.toISOString().slice(0, 10));
    const uniqueDays = new Set(testedDates);

    return {
      conceptsMastered,
      conceptsInProgress,
      averageMastery: Math.round(averageMastery * 1000) / 1000,
      velocityPerDay: Math.round((recentMastered / 7) * 100) / 100,
      totalDaysActive: uniqueDays.size,
    };
  }

  /**
   * Get mastery breakdown grouped by branch.
   */
  async getMasteryByBranch(userId: string): Promise<BranchMastery[]> {
    const records = await this.prisma.userConceptMastery.findMany({
      where: { userId },
      include: {
        concept: {
          select: { branch: true },
        },
      },
    });

    const branchMap = new Map<
      string,
      { totalConcepts: number; masteredConcepts: number; masterySum: number; bloomSum: number }
    >();

    for (const r of records) {
      const branch = r.concept.branch;
      const existing = branchMap.get(branch) ?? {
        totalConcepts: 0,
        masteredConcepts: 0,
        masterySum: 0,
        bloomSum: 0,
      };

      existing.totalConcepts += 1;
      if (r.mastery >= 0.8) existing.masteredConcepts += 1;
      existing.masterySum += r.mastery;
      existing.bloomSum += r.bloomReached;

      branchMap.set(branch, existing);
    }

    return Array.from(branchMap.entries()).map(([branch, data]) => ({
      branch,
      totalConcepts: data.totalConcepts,
      masteredConcepts: data.masteredConcepts,
      averageMastery:
        Math.round((data.masterySum / data.totalConcepts) * 1000) / 1000,
      averageBloom:
        Math.round((data.bloomSum / data.totalConcepts) * 100) / 100,
    }));
  }

  /**
   * Track time spent on a card interaction.
   * Stored as JSON in LearningDay metrics.
   */
  async recordCardTime(
    userId: string,
    conceptId: string,
    cardType: string,
    timeMs: number,
  ): Promise<void> {
    // Find the learning day for this concept
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) return;

    const day = await this.prisma.learningDay.findFirst({
      where: {
        pathId: path.id,
        conceptId,
      },
      orderBy: { dayNumber: 'desc' },
    });

    if (!day) return;

    const currentMetrics = (day.metrics as Record<string, unknown> | null) ?? {};
    const timeTracking = (currentMetrics.timeTracking as Record<string, number> | undefined) ?? {};
    const existingTime = timeTracking[cardType] ?? 0;

    await this.prisma.learningDay.update({
      where: { id: day.id },
      data: {
        metrics: JSON.parse(
          JSON.stringify({
            ...currentMetrics,
            timeTracking: {
              ...timeTracking,
              [cardType]: existingTime + timeMs,
            },
            totalTimeMs: ((currentMetrics.totalTimeMs as number | undefined) ?? 0) + timeMs,
          }),
        ),
      },
    });
  }
}
