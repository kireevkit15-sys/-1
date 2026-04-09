import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { AchievementsService } from '../achievements/achievements.service';
import type { ThinkerClass } from '@razum/shared';
import { determineThinkerClass, getBranchLevels, xpToLevel, xpToNextLevel, Branch } from '@razum/shared';

/** Cache TTLs in seconds */
const CACHE_TTL = {
  SUMMARY: 120,       // 2 min — user profile summary
  WEAKNESSES: 300,    // 5 min — weakness analysis (heavy SQL)
  BATTLE_STATS: 120,  // 2 min — win/loss counts
} as const;

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly achievements: AchievementsService,
  ) {}

  /**
   * Invalidate all cached stats for a user.
   * Called after XP changes, battle results, etc.
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.redis.invalidatePattern(`stats:${userId}:*`);
  }

  /**
   * Calculate total XP from all 5 stats.
   */
  calculateTotalXp(stats: {
    logicXp: number;
    eruditionXp: number;
    strategyXp: number;
    rhetoricXp: number;
    intuitionXp: number;
  }): number {
    return (
      stats.logicXp +
      stats.eruditionXp +
      stats.strategyXp +
      stats.rhetoricXp +
      stats.intuitionXp
    );
  }

  /**
   * Level = floor(sqrt(totalXp / 100)).
   * Level 0 at 0 XP, level 1 at 100 XP, level 10 at 10000 XP.
   */
  calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100));
  }

  /**
   * XP needed to reach next level.
   */
  calculateXpToNextLevel(totalXp: number): { current: number; required: number } {
    const level = this.calculateLevel(totalXp);
    const nextLevel = level + 1;
    const xpForNextLevel = nextLevel * nextLevel * 100;
    const xpForCurrentLevel = level * level * 100;
    return {
      current: totalXp - xpForCurrentLevel,
      required: xpForNextLevel - xpForCurrentLevel,
    };
  }

  /**
   * Enrich raw stats with computed fields (level, totalXp, progress).
   */
  enrichStats(stats: {
    logicXp: number;
    eruditionXp: number;
    strategyXp: number;
    rhetoricXp: number;
    intuitionXp: number;
    rating: number;
    streakDays: number;
    streakDate: Date | null;
  }) {
    const totalXp = this.calculateTotalXp(stats);
    const level = this.calculateLevel(totalXp);
    const progress = this.calculateXpToNextLevel(totalXp);

    const branchLevels = getBranchLevels({
      logic: stats.logicXp,
      erudition: stats.eruditionXp,
      strategy: stats.strategyXp,
      rhetoric: stats.rhetoricXp,
      intuition: stats.intuitionXp,
    });

    const branchProgress = {
      logic: xpToNextLevel(stats.logicXp),
      erudition: xpToNextLevel(stats.eruditionXp),
      strategy: xpToNextLevel(stats.strategyXp),
      rhetoric: xpToNextLevel(stats.rhetoricXp),
      intuition: xpToNextLevel(stats.intuitionXp),
    };

    return {
      ...stats,
      totalXp,
      level,
      xpProgress: progress,
      branchLevels,
      branchProgress,
    };
  }

  async getUserStats(userId: string) {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException('Stats not found for this user');
    }

    return this.enrichStats(stats);
  }

  /**
   * Get the ELO rating for a specific branch (or overall if no branch).
   */
  async getBranchRating(userId: string, branch?: Branch): Promise<number> {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });
    if (!stats) return 1000;

    if (!branch) return stats.rating;

    const fieldMap: Record<Branch, string> = {
      [Branch.LOGIC]: 'logicRating',
      [Branch.ERUDITION]: 'eruditionRating',
      [Branch.STRATEGY]: 'strategyRating',
      [Branch.RHETORIC]: 'rhetoricRating',
      [Branch.INTUITION]: 'intuitionRating',
    };

    return ((stats as any)[fieldMap[branch]] as number) ?? 1000;
  }

  /**
   * Get battle statistics for a user (wins, losses, total).
   */
  async getBattleStats(userId: string) {
    return this.redis.getOrSet(`stats:${userId}:battles`, CACHE_TTL.BATTLE_STATS, async () => {
      const [total, wins] = await Promise.all([
        this.prisma.battle.count({
          where: {
            OR: [{ player1Id: userId }, { player2Id: userId }],
            status: 'COMPLETED',
          },
        }),
        this.prisma.battle.count({
          where: {
            winnerId: userId,
            status: 'COMPLETED',
          },
        }),
      ]);

      return {
        total,
        wins,
        losses: total - wins,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      };
    });
  }

  /**
   * Increment a single XP stat for a user.
   */
  async addXp(
    userId: string,
    stat: 'logicXp' | 'eruditionXp' | 'strategyXp' | 'rhetoricXp' | 'intuitionXp',
    amount: number,
  ) {
    const updated = await this.prisma.userStats.update({
      where: { userId },
      data: {
        [stat]: { increment: amount },
      },
    });

    // Recalculate thinker class
    const newClass = determineThinkerClass({
      logic: updated.logicXp,
      erudition: updated.eruditionXp,
      strategy: updated.strategyXp,
      rhetoric: updated.rhetoricXp,
      intuition: updated.intuitionXp,
    });

    if (updated.thinkerClass !== newClass) {
      await this.prisma.userStats.update({
        where: { userId },
        data: { thinkerClass: newClass },
      });
    }

    // Check branch achievements
    const statToBranch: Record<string, 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION'> = {
      strategyXp: 'STRATEGY',
      logicXp: 'LOGIC',
      eruditionXp: 'ERUDITION',
      rhetoricXp: 'RHETORIC',
      intuitionXp: 'INTUITION',
    };
    const branch = statToBranch[stat];
    if (branch) {
      const branchXp = updated[stat];
      const branchLevel = xpToLevel(branchXp);
      this.achievements
        .checkBranchAchievements(userId, branch, branchXp, branchLevel)
        .catch(() => {});
    }

    await this.invalidateUserCache(userId);
    return this.enrichStats(updated);
  }

  /**
   * Award XP after a battle based on performance and branch.
   *
   * - 10 XP per correct answer → primary stat (branch-based)
   * - 5 XP per correct answer → eruditionXp (secondary)
   * - 25 XP bonus for winning → primary stat
   */
  async addBattleXp(
    userId: string,
    results: {
      correct: number;
      total: number;
      won: boolean;
      branch: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
    },
  ) {
    const XP_PER_CORRECT = 10;
    const XP_WIN_BONUS = 25;
    const XP_SECONDARY_PER_CORRECT = 5;

    const branchToStat: Record<string, 'strategyXp' | 'logicXp' | 'eruditionXp' | 'rhetoricXp' | 'intuitionXp'> = {
      STRATEGY: 'strategyXp',
      LOGIC: 'logicXp',
      ERUDITION: 'eruditionXp',
      RHETORIC: 'rhetoricXp',
      INTUITION: 'intuitionXp',
    };
    const primaryStat = branchToStat[results.branch] ?? 'eruditionXp';

    const primaryXp =
      results.correct * XP_PER_CORRECT + (results.won ? XP_WIN_BONUS : 0);
    const secondaryXp = results.correct * XP_SECONDARY_PER_CORRECT;

    const updated = await this.prisma.userStats.update({
      where: { userId },
      data: {
        [primaryStat]: { increment: primaryXp },
        eruditionXp: { increment: secondaryXp },
      },
    });

    // Check branch achievements for primary branch
    const branchXp = updated[primaryStat];
    const branchLevel = xpToLevel(branchXp);
    this.achievements
      .checkBranchAchievements(userId, results.branch, branchXp, branchLevel)
      .catch(() => {});

    await this.invalidateUserCache(userId);
    return this.enrichStats(updated);
  }

  /**
   * Full profile summary: level, rating, streak, thinker class, XP breakdown.
   */
  async getSummary(userId: string) {
    return this.redis.getOrSet(`stats:${userId}:summary`, CACHE_TTL.SUMMARY, async () => {
      const stats = await this.prisma.userStats.findUnique({
        where: { userId },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      if (!stats) {
        throw new NotFoundException('Stats not found for this user');
      }

      const statsData = {
        logic: stats.logicXp,
        erudition: stats.eruditionXp,
        strategy: stats.strategyXp,
        rhetoric: stats.rhetoricXp,
        intuition: stats.intuitionXp,
      };

      const totalXp = this.calculateTotalXp(stats);
      const branchLevels = getBranchLevels(statsData);
      const progress = this.calculateXpToNextLevel(totalXp);
      const thinkerClass: ThinkerClass = determineThinkerClass(statsData);

      const branchProgress = {
        logic: xpToNextLevel(stats.logicXp),
        erudition: xpToNextLevel(stats.eruditionXp),
        strategy: xpToNextLevel(stats.strategyXp),
        rhetoric: xpToNextLevel(stats.rhetoricXp),
        intuition: xpToNextLevel(stats.intuitionXp),
      };

      const battleStats = await this.getBattleStats(userId);

      return {
        user: stats.user,
        level: branchLevels.overall,
        totalXp,
        xpProgress: progress,
        branchLevels,
        branchProgress,
        rating: stats.rating,
        branchRatings: {
          logic: (stats as any).logicRating ?? 1000,
          erudition: (stats as any).eruditionRating ?? 1000,
          strategy: (stats as any).strategyRating ?? 1000,
          rhetoric: (stats as any).rhetoricRating ?? 1000,
          intuition: (stats as any).intuitionRating ?? 1000,
        },
        streakDays: stats.streakDays,
        streakDate: stats.streakDate,
        thinkerClass,
        stats: {
          logicXp: stats.logicXp,
          eruditionXp: stats.eruditionXp,
          strategyXp: stats.strategyXp,
          rhetoricXp: stats.rhetoricXp,
          intuitionXp: stats.intuitionXp,
        },
        battles: battleStats,
      };
    });
  }

  /**
   * B17.1 — Analyse weak branches and categories by correctness rate.
   */
  async getWeaknesses(userId: string) {
    return this.redis.getOrSet(`stats:${userId}:weaknesses`, CACHE_TTL.WEAKNESSES, () => this.computeWeaknesses(userId));
  }

  private async computeWeaknesses(userId: string) {
    // Per-branch accuracy from battle rounds (raw SQL to avoid nullable groupBy issues)
    const branchRows = await this.prisma.$queryRaw<
      { branch: string; total: bigint; correct: bigint }[]
    >`
      SELECT branch,
             COUNT(id)::bigint AS total,
             SUM(CASE WHEN "isCorrect" = true THEN 1 ELSE 0 END)::bigint AS correct
      FROM battle_rounds
      WHERE "attackerId" = ${userId}::uuid
        AND "isCorrect" IS NOT NULL
        AND branch IS NOT NULL
      GROUP BY branch
      ORDER BY (SUM(CASE WHEN "isCorrect" = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(id), 0)) ASC
    `;

    const branches = branchRows.map((b) => {
      const total = Number(b.total);
      const correct = Number(b.correct);
      return {
        branch: b.branch,
        total,
        correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });

    // Per-category accuracy (across all branches)
    const categoryStats = await this.prisma.$queryRaw<
      { category: string; total: bigint; correct: bigint }[]
    >`
      SELECT q.category,
             COUNT(br.id)::bigint AS total,
             SUM(CASE WHEN br."isCorrect" = true THEN 1 ELSE 0 END)::bigint AS correct
      FROM battle_rounds br
      JOIN questions q ON q.id = br."questionId"
      WHERE br."attackerId" = ${userId}::uuid
        AND br."isCorrect" IS NOT NULL
      GROUP BY q.category
      HAVING COUNT(br.id) >= 3
      ORDER BY (SUM(CASE WHEN br."isCorrect" = true THEN 1 ELSE 0 END)::float / COUNT(br.id)) ASC
      LIMIT 10
    `;

    const categories = categoryStats.map((c) => ({
      category: c.category,
      total: Number(c.total),
      correct: Number(c.correct),
      accuracy:
        Number(c.total) > 0
          ? Math.round((Number(c.correct) / Number(c.total)) * 100)
          : 0,
    }));

    // Overall stats
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    const xpByBranch = userStats
      ? {
          STRATEGY: userStats.strategyXp,
          LOGIC: userStats.logicXp,
          ERUDITION: userStats.eruditionXp,
          RHETORIC: userStats.rhetoricXp,
          INTUITION: userStats.intuitionXp,
        }
      : {};

    return {
      branches,
      categories,
      xpByBranch,
      weakestBranch: branches[0]?.branch ?? null,
    };
  }

  /**
   * B17.2 — Recommend modules to improve weak branches.
   */
  async getRecommendations(userId: string) {
    const weaknesses = await this.getWeaknesses(userId);

    // Sort branches by accuracy ascending (weakest first)
    const weakBranches = weaknesses.branches
      .filter((b) => b.accuracy < 70)
      .map((b) => b.branch);

    // If no weak branches, recommend branches with lowest XP
    const targetBranches: string[] =
      weakBranches.length > 0
        ? weakBranches
        : Object.entries(weaknesses.xpByBranch)
            .sort(([, a], [, b]) => (a as number) - (b as number))
            .slice(0, 2)
            .map(([branch]) => branch);

    // Find uncompleted modules for target branches
    const modules = await this.prisma.module.findMany({
      where: {
        branch: { in: targetBranches as any },
      },
      orderBy: [{ branch: 'asc' }, { orderIndex: 'asc' }],
      include: {
        progress: {
          where: { userId },
        },
      },
    });

    const recommendations = modules
      .filter((m) => {
        const prog = m.progress[0];
        return !prog || !prog.completedAt;
      })
      .slice(0, 5)
      .map((m) => {
        const prog = m.progress[0];
        const completedCount = prog?.completedQuestions?.length ?? 0;
        const totalCount = m.questionIds.length;
        const branchAccuracy = weaknesses.branches.find((b) => b.branch === m.branch)?.accuracy ?? 0;
        return {
          moduleId: m.id,
          branch: m.branch,
          title: m.title,
          description: m.description,
          progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
          completedQuestions: completedCount,
          totalQuestions: totalCount,
          reason:
            weakBranches.includes(m.branch)
              ? `Ветка ${m.branch} — точность ${branchAccuracy}%`
              : `Ветка ${m.branch} — наименьший XP`,
        };
      });

    // Weak categories with practice suggestions
    const practiceCategories = weaknesses.categories
      .filter((c) => c.accuracy < 60)
      .slice(0, 5)
      .map((c) => ({
        category: c.category,
        accuracy: c.accuracy,
        suggestion: `Практикуйте категорию «${c.category}» — текущая точность ${c.accuracy}%`,
      }));

    return {
      targetBranches,
      modules: recommendations,
      practiceCategories,
    };
  }

  async getLeaderboard(limit: number, offset: number) {
    const safeLimit = Math.min(limit, 100);

    const users = await this.prisma.userStats.findMany({
      select: {
        userId: true,
        rating: true,
        streakDays: true,
        logicXp: true,
        eruditionXp: true,
        strategyXp: true,
        rhetoricXp: true,
        intuitionXp: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
      take: safeLimit,
      skip: offset,
    });

    return {
      leaderboard: users.map((entry, index: number) => {
        const totalXp = this.calculateTotalXp(entry);
        const branchLevels = getBranchLevels({
          logic: entry.logicXp,
          erudition: entry.eruditionXp,
          strategy: entry.strategyXp,
          rhetoric: entry.rhetoricXp,
          intuition: entry.intuitionXp,
        });
        return {
          rank: offset + index + 1,
          ...entry,
          totalXp,
          level: branchLevels.overall,
          branchLevels,
        };
      }),
    };
  }
}
