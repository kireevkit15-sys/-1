import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { ThinkerClass } from '@razum/shared';
import { determineThinkerClass, getBranchLevels, xpToNextLevel, Branch } from '@razum/shared';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.enrichStats(updated);
  }

  /**
   * Full profile summary: level, rating, streak, thinker class, XP breakdown.
   */
  async getSummary(userId: string) {
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
