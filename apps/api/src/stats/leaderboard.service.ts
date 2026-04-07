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
    if (type === 'xp') {
      return this.buildXpLeaderboard(period, limit);
    }

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
      entries: entries.map((e, i) => this.mapLeaderboardEntry(e, i)),
    };
  }

  private async buildXpLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
  ) {
    const entries = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        rating: number;
        streakDays: number;
        logicXp: number;
        eruditionXp: number;
        strategyXp: number;
        rhetoricXp: number;
        intuitionXp: number;
        totalXp: bigint;
        name: string;
        avatarUrl: string | null;
      }>
    >`
      SELECT us."userId", us.rating, us."streakDays",
             us."logicXp", us."eruditionXp", us."strategyXp", us."rhetoricXp", us."intuitionXp",
             (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") AS "totalXp",
             u.name, u."avatarUrl"
      FROM user_stats us
      JOIN users u ON u.id = us."userId"
      ORDER BY (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") DESC
      LIMIT ${limit}
    `;

    return {
      type: 'xp' as const,
      period,
      entries: entries.map((e, i) => {
        const totalXp = Number(e.totalXp);
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
          user: { id: e.userId, name: e.name, avatarUrl: e.avatarUrl },
          rating: e.rating,
          totalXp,
          level,
          streakDays: e.streakDays,
          thinkerClass,
        };
      }),
    };
  }

  private mapLeaderboardEntry(
    e: {
      userId: string;
      rating: number;
      streakDays: number;
      logicXp: number;
      eruditionXp: number;
      strategyXp: number;
      rhetoricXp: number;
      intuitionXp: number;
      user: { id: string; name: string; avatarUrl: string | null };
    },
    i: number,
  ) {
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
    let total: number;

    if (type === 'xp') {
      const result = await this.prisma.$queryRaw<[{ rank: bigint; total: bigint }]>`
        SELECT
          (SELECT COUNT(*) FROM user_stats
           WHERE ("logicXp" + "eruditionXp" + "strategyXp" + "rhetoricXp" + "intuitionXp") > ${totalXp}
          ) + 1 AS rank,
          (SELECT COUNT(*) FROM user_stats) AS total
      `;
      rank = Number(result[0].rank);
      total = Number(result[0].total);
    } else {
      const [above, count] = await Promise.all([
        this.prisma.userStats.count({
          where: type === 'rating'
            ? { rating: { gt: userStats.rating } }
            : { streakDays: { gt: userStats.streakDays } },
        }),
        this.prisma.userStats.count(),
      ]);
      rank = above + 1;
      total = count;
    }

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
