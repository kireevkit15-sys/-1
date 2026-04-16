import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Types ────────────────────────────────────────────────────────────

interface Interaction {
  cardIndex: number;
  type: 'VIEW' | 'ANSWER' | 'DEEPER' | 'COMPLETE';
  timeSpentMs: number;
  answer: string | null;
  timestamp: string;
}

interface DayMetrics {
  interactions?: Interaction[];
}

export interface AdaptationSignals {
  /** User engagement score 0-1: based on time spent and depth clicks */
  engagementScore: number;
  /** How fast user masters concepts 0-1: high = quick learner */
  masterySpeed: number;
  /** How often user skips/rushes 0-1: high = lots of skipping */
  skipRate: number;
  /** Concept IDs where user scored poorly */
  weakConcepts: string[];
}

// ── Thresholds ───────────────────────────────────────────────────────

/** Minimum ms per card to count as "engaged" (8 seconds) */
const ENGAGED_TIME_MS = 8_000;
/** Max reasonable ms per card for normalization (5 minutes) */
const MAX_TIME_MS = 300_000;
/** Mastery threshold above which a concept is considered "mastered fast" */
const FAST_MASTERY_THRESHOLD = 0.6;
/** Minimum ms per card — below this the user is "rushing" */
const RUSH_TIME_MS = 2_000;
/** Mastery below which a concept counts as weak */
const WEAK_MASTERY_THRESHOLD = 0.2;
/** Wrong answers ratio above which a concept counts as weak */
const WEAK_WRONG_RATIO = 0.5;

@Injectable()
export class AdaptationService {
  private readonly logger = new Logger(AdaptationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Analyze a completed day's metrics ──────────────────────────────

  async analyzeDayMetrics(
    userId: string,
    dayNumber: number,
  ): Promise<AdaptationSignals> {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      return this.emptySignals();
    }

    const day = await this.prisma.learningDay.findUnique({
      where: {
        pathId_dayNumber: { pathId: path.id, dayNumber },
      },
      include: { concept: true },
    });

    if (!day) {
      return this.emptySignals();
    }

    const metrics = (day.metrics as DayMetrics | null) ?? {};
    const interactions = metrics.interactions ?? [];

    // Engagement: time spent + depth clicks
    const engagementScore = this.calcEngagement(interactions);

    // Mastery speed: check how well the user answered quiz/explain
    const mastery = await this.prisma.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId: day.conceptId } },
    });
    const masterySpeed = this.calcMasterySpeed(mastery, interactions);

    // Skip rate: cards with very low time or no interactions
    const totalCards = Array.isArray(day.cards) ? (day.cards as unknown[]).length : 8;
    const skipRate = this.calcSkipRate(interactions, totalCards);

    // Weak concepts: gather from all mastery records
    const weakConcepts = await this.findWeakConcepts(userId);

    return { engagementScore, masterySpeed, skipRate, weakConcepts };
  }

  // ── Reorder remaining days based on adaptation signals ─────────────

  async adaptPath(userId: string): Promise<void> {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      return;
    }

    // Get signals from the most recently completed day
    const lastCompletedDay = path.currentDay - 1;
    if (lastCompletedDay < 1) {
      return;
    }

    const signals = await this.analyzeDayMetrics(userId, lastCompletedDay);

    // Get uncompleted days (from currentDay onward)
    const remainingDays = await this.prisma.learningDay.findMany({
      where: {
        pathId: path.id,
        completedAt: null,
      },
      include: {
        concept: {
          select: { id: true, branch: true, difficulty: true, bloomLevel: true },
        },
      },
      orderBy: { dayNumber: 'asc' },
    });

    if (remainingDays.length <= 1) {
      return;
    }

    // Get branch engagement scores for prioritization
    const branchScores = await this.getAllBranchEngagements(userId);

    // Get recently completed day to know which branch was engaging
    const completedDay = await this.prisma.learningDay.findUnique({
      where: {
        pathId_dayNumber: { pathId: path.id, dayNumber: lastCompletedDay },
      },
      include: { concept: { select: { branch: true } } },
    });

    const recentBranch = completedDay?.concept.branch ?? null;

    // Score each remaining day for reordering
    const scored = remainingDays.map((day) => {
      let score = 0;

      // Rule 1 — Interesting -> more: boost concepts from engaged branches
      const branchEng = branchScores.get(day.concept.branch) ?? 0.5;
      if (signals.engagementScore > 0.6) {
        score += branchEng * 3;
        // Extra boost if same branch as recently engaging day
        if (recentBranch && day.concept.branch === recentBranch) {
          score += 2;
        }
      }

      // Rule 2 — Mastered -> faster: if user masters fast, push harder concepts up
      if (signals.masterySpeed > 0.7) {
        const diffScore =
          day.concept.difficulty === 'GOLD' ? 3 :
          day.concept.difficulty === 'SILVER' ? 2 : 1;
        score += diffScore + day.concept.bloomLevel * 0.5;
      }

      // Rule 3 — Uninteresting -> minimum: deprioritize low-engagement branches
      if (branchEng < 0.3 && signals.skipRate > 0.5) {
        score -= 3;
      }

      // Rule 4 — Weak -> different approach: keep weak concepts but move them
      // to later positions so user encounters different content first
      const isWeak = signals.weakConcepts.includes(day.concept.id);
      if (isWeak) {
        // Don't push too far back — user still needs to learn them
        score -= 1;
      }

      return { day, score };
    });

    // Sort by score descending (highest priority first)
    scored.sort((a, b) => b.score - a.score);

    // Reassign day numbers starting from currentDay
    const updates: Promise<unknown>[] = [];
    for (let i = 0; i < scored.length; i++) {
      const item = scored[i];
      if (!item) continue;

      const newDayNumber = path.currentDay + i;
      if (item.day.dayNumber !== newDayNumber) {
        updates.push(
          this.prisma.learningDay.update({
            where: { id: item.day.id },
            data: { dayNumber: newDayNumber },
          }),
        );
      }
    }

    if (updates.length > 0) {
      // Use transaction: first set all to negative (temp) to avoid unique constraint,
      // then set to final values
      await this.prisma.$transaction(async (tx) => {
        // Phase 1: move to temporary negative day numbers to avoid unique conflicts
        for (let i = 0; i < scored.length; i++) {
          const item = scored[i];
          if (!item) continue;
          await tx.learningDay.update({
            where: { id: item.day.id },
            data: { dayNumber: -(i + 1) },
          });
        }
        // Phase 2: assign final day numbers
        for (let i = 0; i < scored.length; i++) {
          const item = scored[i];
          if (!item) continue;
          await tx.learningDay.update({
            where: { id: item.day.id },
            data: { dayNumber: path.currentDay + i },
          });
        }
      });

      this.logger.log(
        `Adapted path for user ${userId}: reordered ${scored.length} remaining days`,
      );
    }

    // Rule 4 supplement: for weak concepts, generate alternative card approaches
    await this.injectAlternativeApproaches(path.id, signals.weakConcepts);
  }

  // ── Get engagement score for a branch (0-1) ───────────────────────

  async getBranchEngagement(
    userId: string,
    branch: string,
  ): Promise<number> {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      return 0;
    }

    const completedDays = await this.prisma.learningDay.findMany({
      where: {
        pathId: path.id,
        completedAt: { not: null },
        concept: { branch: branch as 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION' },
      },
      select: { metrics: true },
    });

    if (completedDays.length === 0) {
      return 0;
    }

    const engagements = completedDays.map((day) => {
      const metrics = (day.metrics as DayMetrics | null) ?? {};
      return this.calcEngagement(metrics.interactions ?? []);
    });

    return engagements.reduce((sum, e) => sum + e, 0) / engagements.length;
  }

  // ── Suggest next concept based on adaptive rules ──────────────────

  async suggestNextConcept(userId: string): Promise<string | null> {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      return null;
    }

    // Get current day concept to know the baseline
    const currentDay = await this.prisma.learningDay.findUnique({
      where: {
        pathId_dayNumber: { pathId: path.id, dayNumber: path.currentDay },
      },
      include: { concept: true },
    });

    if (!currentDay) {
      return null;
    }

    // Get signals from recently completed days
    const lastCompleted = path.currentDay - 1;
    const signals =
      lastCompleted >= 1
        ? await this.analyzeDayMetrics(userId, lastCompleted)
        : this.emptySignals();

    // Get concepts user hasn't started yet (not in any LearningDay for this path)
    const existingConceptIds = await this.prisma.learningDay.findMany({
      where: { pathId: path.id },
      select: { conceptId: true },
    });
    const usedIds = new Set(existingConceptIds.map((d) => d.conceptId));

    const candidates = await this.prisma.concept.findMany({
      where: {
        id: { notIn: [...usedIds] },
      },
      select: {
        id: true,
        branch: true,
        difficulty: true,
        bloomLevel: true,
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    // Score candidates
    const branchScores = await this.getAllBranchEngagements(userId);

    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const concept of candidates) {
      let score = 0;
      const branchEng = branchScores.get(concept.branch) ?? 0.5;

      // Rule 1: prefer high-engagement branches
      if (signals.engagementScore > 0.5) {
        score += branchEng * 5;
      }

      // Rule 2: if mastering fast, prefer harder concepts
      if (signals.masterySpeed > 0.7) {
        const diffBonus =
          concept.difficulty === 'GOLD' ? 3 :
          concept.difficulty === 'SILVER' ? 2 : 1;
        score += diffBonus;
      }

      // Rule 3: reduce low-engagement branches
      if (branchEng < 0.3) {
        score -= 2;
      }

      // Prefer concepts adjacent in difficulty to current
      const currentDiff = currentDay.concept.difficulty;
      if (concept.difficulty === currentDiff) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = concept.id;
      }
    }

    return bestId;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private calcEngagement(interactions: Interaction[]): number {
    if (interactions.length === 0) {
      return 0;
    }

    const deeperClicks = interactions.filter((i) => i.type === 'DEEPER').length;
    const totalTime = interactions.reduce((sum, i) => sum + (i.timeSpentMs ?? 0), 0);
    const avgTimePerInteraction = totalTime / interactions.length;

    // Normalize time component (0-1): 8s is threshold, 5min is max
    const timeScore = Math.min(
      1,
      Math.max(0, (avgTimePerInteraction - RUSH_TIME_MS) / (MAX_TIME_MS - RUSH_TIME_MS)),
    );

    // Depth component: each "DEEPER" click boosts engagement
    // Typical day has 8 cards, so 2+ depth clicks is high engagement
    const depthScore = Math.min(1, deeperClicks / 3);

    // Weighted: 60% time, 40% depth clicks
    return timeScore * 0.6 + depthScore * 0.4;
  }

  private calcMasterySpeed(
    mastery: { mastery: number; timesCorrect: number; timesWrong: number } | null,
    interactions: Interaction[],
  ): number {
    if (!mastery) {
      return 0;
    }

    // Factor 1: high mastery with few attempts = fast learner
    const totalAttempts = mastery.timesCorrect + mastery.timesWrong;
    const accuracyScore =
      totalAttempts > 0 ? mastery.timesCorrect / totalAttempts : 0;

    // Factor 2: high mastery value
    const masteryScore = Math.min(1, mastery.mastery / FAST_MASTERY_THRESHOLD);

    // Factor 3: answers given quickly (ANSWER interactions with short time)
    const answerInteractions = interactions.filter((i) => i.type === 'ANSWER');
    let speedScore = 0.5;
    if (answerInteractions.length > 0) {
      const avgAnswerTime =
        answerInteractions.reduce((s, i) => s + (i.timeSpentMs ?? 0), 0) /
        answerInteractions.length;
      // Under 30s for quiz answers = fast
      speedScore = Math.min(1, Math.max(0, 1 - avgAnswerTime / 60_000));
    }

    return accuracyScore * 0.4 + masteryScore * 0.3 + speedScore * 0.3;
  }

  private calcSkipRate(
    interactions: Interaction[],
    totalCards: number,
  ): number {
    if (totalCards === 0) {
      return 0;
    }

    // Cards with no interactions at all
    const interactedCards = new Set(interactions.map((i) => i.cardIndex));
    const skippedCards = totalCards - interactedCards.size;

    // Cards with very little time (rushing)
    const rushedCards = interactions.filter(
      (i) => i.type === 'VIEW' && (i.timeSpentMs ?? 0) < RUSH_TIME_MS,
    ).length;

    const skipComponent = skippedCards / totalCards;
    const rushComponent = totalCards > 0 ? rushedCards / totalCards : 0;

    // Weighted: 60% actual skips, 40% rushing
    return Math.min(1, skipComponent * 0.6 + rushComponent * 0.4);
  }

  private async findWeakConcepts(userId: string): Promise<string[]> {
    const weakMasteries = await this.prisma.userConceptMastery.findMany({
      where: {
        userId,
        OR: [
          { mastery: { lt: WEAK_MASTERY_THRESHOLD } },
        ],
      },
      select: { conceptId: true, mastery: true, timesCorrect: true, timesWrong: true },
    });

    return weakMasteries
      .filter((m) => {
        const total = m.timesCorrect + m.timesWrong;
        // Concept is weak if mastery is low AND they've actually attempted it
        if (total === 0) return false;
        const wrongRatio = m.timesWrong / total;
        return m.mastery < WEAK_MASTERY_THRESHOLD || wrongRatio > WEAK_WRONG_RATIO;
      })
      .map((m) => m.conceptId);
  }

  private async getAllBranchEngagements(
    userId: string,
  ): Promise<Map<string, number>> {
    const branches = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];
    const results = new Map<string, number>();

    // Batch all branch queries
    const engagements = await Promise.all(
      branches.map(async (branch) => ({
        branch,
        score: await this.getBranchEngagement(userId, branch),
      })),
    );

    for (const { branch, score } of engagements) {
      results.set(branch, score);
    }

    return results;
  }

  /**
   * Rule 4: For weak concepts, mark their LearningDay cards to include
   * alternative depth layers (different angle of approach).
   */
  private async injectAlternativeApproaches(
    pathId: string,
    weakConceptIds: string[],
  ): Promise<void> {
    if (weakConceptIds.length === 0) {
      return;
    }

    // Find uncompleted days for weak concepts
    const weakDays = await this.prisma.learningDay.findMany({
      where: {
        pathId,
        completedAt: null,
        conceptId: { in: weakConceptIds },
      },
      include: {
        concept: {
          include: {
            depthLayers: {
              where: { layerType: { in: ['ALTERNATIVE', 'PHILOSOPHY', 'BOOK'] } },
              select: { layerType: true, content: true },
            },
          },
        },
      },
    });

    for (const day of weakDays) {
      const cards = Array.isArray(day.cards) ? (day.cards as Record<string, unknown>[]) : [];
      const altLayers = day.concept.depthLayers;

      if (altLayers.length === 0) {
        continue;
      }

      // Check if alternative approach card already exists
      const hasAltCard = cards.some((c) => c.type === 'alternative_approach');
      if (hasAltCard) {
        continue;
      }

      // Build alternative approach card from depth layers
      const altContent = altLayers.map((layer) => ({
        layerType: layer.layerType,
        content: layer.content,
      }));

      const updatedCards = [
        ...cards.slice(0, 2), // hook + explanation
        {
          type: 'alternative_approach',
          content: {
            reason: 'This concept needs a different angle based on your learning patterns.',
            approaches: altContent,
          },
        },
        ...cards.slice(2), // rest of the cards
      ];

      await this.prisma.learningDay.update({
        where: { id: day.id },
        data: { cards: JSON.parse(JSON.stringify(updatedCards)) },
      });
    }
  }

  private emptySignals(): AdaptationSignals {
    return {
      engagementScore: 0.5,
      masterySpeed: 0.5,
      skipRate: 0,
      weakConcepts: [],
    };
  }
}
