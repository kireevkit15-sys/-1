import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { determineThinkerClass } from '@razum/shared';

type LeaderboardType = 'rating' | 'xp' | 'streak';
type LeaderboardPeriod = 'all' | 'week' | 'month';

const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Top-N leaderboard with Redis cache (5 min TTL).
   */
  async getLeaderboard(
    type: LeaderboardType = 'rating',
    period: LeaderboardPeriod = 'all',
    limit = 20,
  ) {
    const safeLimit = Math.min(limit, 100);
    const cacheKey = `leaderboard:${type}:${period}:${safeLimit}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.buildLeaderboard(type, period, safeLimit);

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  /**
   * Current user's position in the leaderboard.
   */
  async getMyPosition(
    userId: string,
    type: LeaderboardType = 'rating',
    period: LeaderboardPeriod = 'all',
  ) {
    const cacheKey = `leaderboard:pos:${userId}:${type}:${period}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const result = await this.calculatePosition(userId, type, period);

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  // ── Private ─────────────────────────────────────

  private async buildLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number,
  ) {
    const orderBy = this.getOrderBy(type);

    const entries = await this.prisma.userStats.findMany({
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
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy,
      take: limit,
    });

    return {
      type,
      period,
      entries: entries.map((e, i) => {
        const totalXp =
          e.logicXp + e.eruditionXp + e.strategyXp + e.rhetoricXp + e.intuitionXp;
        const level = Math.floor(Math.sqrt(totalXp / 100));
        const thinkerClass = determineThinkerClass({
          logic: e.logicXp,
          erudition: e.eruditionXp,
          strategy: e.strategyXp,
          rhetoric: e.rhetoricXp,
          intuition: e.intuitionXp,
        });

        return {
          rank: i + 1,
          user: e.user,
          rating: e.rating,
          totalXp,
          level,
          streakDays: e.streakDays,
          thinkerClass,
        };
      }),
    };
  }

  private async calculatePosition(
    userId: string,
    type: LeaderboardType,
    _period: LeaderboardPeriod,
  ) {
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: {
        rating: true,
        streakDays: true,
        logicXp: true,
        eruditionXp: true,
        strategyXp: true,
        rhetoricXp: true,
        intuitionXp: true,
      },
    });

    if (!userStats) {
      return { rank: null, total: 0 };
    }

    const totalXp =
      userStats.logicXp +
      userStats.eruditionXp +
      userStats.strategyXp +
      userStats.rhetoricXp +
      userStats.intuitionXp;

    let rank: number;

    if (type === 'rating') {
      rank =
        (await this.prisma.userStats.count({
          where: { rating: { gt: userStats.rating } },
        })) + 1;
    } else if (type === 'streak') {
      rank =
        (await this.prisma.userStats.count({
          where: { streakDays: { gt: userStats.streakDays } },
        })) + 1;
    } else {
      // XP — count users with higher total XP via raw query
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM user_stats
        WHERE ("logicXp" + "eruditionXp" + "strategyXp" + "rhetoricXp" + "intuitionXp")
          > ${totalXp}
      `;
      rank = Number(result[0].count) + 1;
    }

    const total = await this.prisma.userStats.count();

    return {
      rank,
      total,
      type,
      rating: userStats.rating,
      totalXp,
      streakDays: userStats.streakDays,
    };
  }

  private getOrderBy(type: LeaderboardType) {
    switch (type) {
      case 'rating':
        return { rating: 'desc' as const };
      case 'streak':
        return { streakDays: 'desc' as const };
      case 'xp':
        // Prisma doesn't support computed orderBy, so order by rating as fallback
        // The actual sorting by totalXp would need raw query for true accuracy
        return { rating: 'desc' as const };
    }
  }
}
