import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LevelName } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BattleUnlockInfo {
  levelCompleted: string; // "Наблюдатель"
  newQuestionsCount: number;
  newBranches: string[]; // branches with newly unlocked questions
  message: string; // Russian motivational message
}

/** Mastery >= this threshold means the concept's linked questions are unlocked. */
const MASTERY_UNLOCK_THRESHOLD = 0.3;

/** Learning level → maximum allowed battle difficulty (Difficulty enum). */
const LEVEL_TO_MAX_DIFFICULTY: Record<LevelName, string[]> = {
  SLEEPING: ['BRONZE'],
  AWAKENED: ['BRONZE', 'SILVER'],
  OBSERVER: ['BRONZE', 'SILVER', 'GOLD'],
  WARRIOR: ['BRONZE', 'SILVER', 'GOLD'],
  STRATEGIST: ['BRONZE', 'SILVER', 'GOLD'],
  MASTER: ['BRONZE', 'SILVER', 'GOLD'],
};

/** Display names for levels (Russian). */
const LEVEL_DISPLAY_NAMES: Record<LevelName, string> = {
  SLEEPING: 'Спящий',
  AWAKENED: 'Пробудившийся',
  OBSERVER: 'Наблюдатель',
  WARRIOR: 'Воин',
  STRATEGIST: 'Стратег',
  MASTER: 'Мастер',
};

/** Motivational messages per level. */
const UNLOCK_MESSAGES: Record<LevelName, string> = {
  SLEEPING: 'Пробуждение начинается. Первые вопросы ждут тебя в бою.',
  AWAKENED: 'Ты открыл глаза. Новые вопросы уже на арене — докажи, что знания не пусты.',
  OBSERVER: 'Наблюдатель видит больше. Теперь и арена откроется шире.',
  WARRIOR: 'Воин вступает в бой с полным арсеналом. Все ранги доступны.',
  STRATEGIST: 'Стратег управляет полем боя. Ни один вопрос не скрыт от тебя.',
  MASTER: 'Мастер. Для тебя открыты мастер-вопросы — высший уровень вызова.',
};

@Injectable()
export class BattleLinkService {
  private readonly logger = new Logger(BattleLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── L23.1: Get question IDs unlocked by user's mastered concepts ───────

  /**
   * Returns IDs of active questions linked to concepts where the user's
   * mastery >= MASTERY_UNLOCK_THRESHOLD.
   */
  async getUnlockedQuestions(userId: string): Promise<string[]> {
    // Get concepts the user has mastered above threshold
    const masteredConcepts = await this.prisma.userConceptMastery.findMany({
      where: {
        userId,
        mastery: { gte: MASTERY_UNLOCK_THRESHOLD },
      },
      select: { conceptId: true },
    });

    if (masteredConcepts.length === 0) {
      return [];
    }

    const conceptIds = masteredConcepts.map((m) => m.conceptId);

    // Get question IDs linked to those concepts (only active questions)
    const conceptQuestions = await this.prisma.conceptQuestion.findMany({
      where: {
        conceptId: { in: conceptIds },
        question: { isActive: true },
      },
      select: { questionId: true },
    });

    // Deduplicate (a question may be linked to multiple mastered concepts)
    const uniqueIds = [...new Set(conceptQuestions.map((cq) => cq.questionId))];
    return uniqueIds;
  }

  // ── L23.1: Filter questions for a battle based on both players ─────────

  /**
   * Returns question IDs that are unlocked for BOTH players in a given branch.
   * Falls back to all active branch questions if the intersection is too small.
   */
  async filterBattleQuestions(
    userId1: string,
    userId2: string,
    branch: string,
    count: number,
  ): Promise<string[]> {
    const [unlocked1, unlocked2] = await Promise.all([
      this.getUnlockedQuestions(userId1),
      this.getUnlockedQuestions(userId2),
    ]);

    const set1 = new Set(unlocked1);
    const set2 = new Set(unlocked2);

    // Intersection: questions both players have unlocked
    const commonIds = unlocked1.filter((id) => set2.has(id));

    // Filter by branch among common IDs
    let branchQuestions: string[];

    if (commonIds.length > 0) {
      const matching = await this.prisma.question.findMany({
        where: {
          id: { in: commonIds },
          branch: branch as never,
          isActive: true,
        },
        select: { id: true },
      });
      branchQuestions = matching.map((q) => q.id);
    } else {
      branchQuestions = [];
    }

    // If intersection is too small, fall back to all active questions in branch
    if (branchQuestions.length < count) {
      this.logger.warn(
        `Intersection too small (${branchQuestions.length}/${count}) for branch ${branch}. ` +
          `Falling back to all active questions.`,
      );
      const fallback = await this.prisma.question.findMany({
        where: {
          branch: branch as never,
          isActive: true,
        },
        select: { id: true },
      });
      branchQuestions = fallback.map((q) => q.id);
    }

    // Shuffle and take `count`
    return this.shuffleAndTake(branchQuestions, count);
  }

  // ── L23.2: Get maximum allowed battle rank based on learning level ─────

  /**
   * Returns the highest difficulty string the user's learning level permits.
   */
  getMaxBattleRank(learningLevel: string): string {
    const allowed = LEVEL_TO_MAX_DIFFICULTY[learningLevel as LevelName];
    if (!allowed) {
      return 'BRONZE'; // safest default
    }
    return allowed[allowed.length - 1] ?? 'BRONZE';
  }

  // ── L23.2: Check if user can participate in a battle at given difficulty ──

  /**
   * Verifies the user's learning level permits the requested battle difficulty.
   */
  async canParticipate(
    userId: string,
    difficulty: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
      select: { currentLevel: true },
    });

    // Users without a learning path can only do BRONZE
    if (!path) {
      if (difficulty === 'BRONZE') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Начни путь обучения, чтобы открыть бои выше бронзового уровня.',
      };
    }

    const allowedDifficulties = LEVEL_TO_MAX_DIFFICULTY[path.currentLevel] ?? ['BRONZE'];

    if (allowedDifficulties.includes(difficulty)) {
      return { allowed: true };
    }

    const currentLevelName = LEVEL_DISPLAY_NAMES[path.currentLevel] ?? path.currentLevel;
    const maxRank = this.getMaxBattleRank(path.currentLevel);

    return {
      allowed: false,
      reason:
        `Твой уровень «${currentLevelName}» позволяет бои до ${maxRank}. ` +
        `Продвигайся в обучении, чтобы открыть ${difficulty}.`,
    };
  }

  // ── L23.3: Get "В бой" card data after barrier completion ──────────────

  /**
   * After a user passes a level barrier, returns info about newly unlocked
   * battle questions and branches for the "В бой" motivational card.
   */
  async getBattleUnlockInfo(
    userId: string,
    completedLevel: string,
  ): Promise<BattleUnlockInfo> {
    const level = completedLevel as LevelName;
    const displayName = LEVEL_DISPLAY_NAMES[level] ?? completedLevel;

    // Get all currently unlocked question IDs
    const unlockedIds = await this.getUnlockedQuestions(userId);

    // Count per branch
    let newBranches: string[] = [];
    let newQuestionsCount = 0;

    if (unlockedIds.length > 0) {
      const branchCounts = await this.prisma.question.groupBy({
        by: ['branch'],
        where: {
          id: { in: unlockedIds },
          isActive: true,
        },
        _count: { id: true },
      });

      newQuestionsCount = branchCounts.reduce((sum, bc) => sum + bc._count.id, 0);
      newBranches = branchCounts.map((bc) => bc.branch);
    }

    const message = UNLOCK_MESSAGES[level] ?? 'Новые вопросы разблокированы. Иди в бой!';

    return {
      levelCompleted: displayName,
      newQuestionsCount,
      newBranches,
      message,
    };
  }

  // ── Get count of questions available per branch for a user ─────────────

  /**
   * Returns a map of branch → number of unlocked questions for the user.
   */
  async getAvailableQuestionsByBranch(userId: string): Promise<Record<string, number>> {
    const unlockedIds = await this.getUnlockedQuestions(userId);

    if (unlockedIds.length === 0) {
      return {};
    }

    const branchCounts = await this.prisma.question.groupBy({
      by: ['branch'],
      where: {
        id: { in: unlockedIds },
        isActive: true,
      },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const bc of branchCounts) {
      result[bc.branch] = bc._count.id;
    }

    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Fisher-Yates shuffle, then take first `count` elements.
   */
  private shuffleAndTake(arr: string[], count: number): string[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled.slice(0, count);
  }
}
