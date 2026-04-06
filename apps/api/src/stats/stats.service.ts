import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    return {
      ...stats,
      totalXp,
      level,
      xpProgress: progress,
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
        return {
          rank: offset + index + 1,
          ...entry,
          totalXp,
          level: this.calculateLevel(totalXp),
        };
      }),
    };
  }
}
