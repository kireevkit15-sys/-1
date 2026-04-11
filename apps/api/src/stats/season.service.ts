import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/** XP bonus rewards for top-10 players at season end */
const SEASON_REWARDS: Record<number, number> = {
  1: 5000,
  2: 3000,
  3: 2000,
  4: 1500,
  5: 1200,
  6: 1000,
  7: 800,
  8: 600,
  9: 400,
  10: 200,
};

const DEFAULT_RATING = 1000;

@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get the currently active season (if any).
   */
  async getActiveSeason() {
    return this.prisma.season.findFirst({
      where: { isActive: true },
      include: { rewards: { orderBy: { rank: 'asc' }, take: 10 } },
    });
  }

  /**
   * Get all seasons with their top-10 rewards.
   */
  async getSeasonHistory() {
    return this.prisma.season.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        rewards: {
          orderBy: { rank: 'asc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Get rewards for a specific user across all seasons.
   */
  async getUserSeasonRewards(userId: string) {
    return this.prisma.seasonReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        season: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });
  }

  /**
   * End the current season: snapshot top-10, award XP, reset ratings, create next season.
   * Called by cron on the 1st of each month.
   */
  async endCurrentSeason(): Promise<{ seasonId: string; rewardsGiven: number } | null> {
    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
    });

    if (!activeSeason) {
      this.logger.warn('No active season to end');
      return null;
    }

    this.logger.log(`Ending season: ${activeSeason.name} (${activeSeason.id})`);

    // 1. Get top-10 by rating
    const top10 = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        rating: number;
        totalXp: bigint;
      }>
    >`
      SELECT us."userId", us.rating,
             (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") AS "totalXp"
      FROM user_stats us
      JOIN users u ON u.id = us."userId" AND u."deletedAt" IS NULL
      ORDER BY us.rating DESC
      LIMIT 10
    `;

    // 2. Create season rewards and award bonus XP
    let rewardsGiven = 0;
    for (let i = 0; i < top10.length; i++) {
      const entry = top10[i]!;
      const rank = i + 1;
      const xpReward = SEASON_REWARDS[rank] ?? 0;

      await this.prisma.$transaction([
        // Create reward record
        this.prisma.seasonReward.create({
          data: {
            seasonId: activeSeason.id,
            userId: entry.userId,
            rank,
            rating: entry.rating,
            totalXp: Number(entry.totalXp),
            xpReward,
          },
        }),
        // Award bonus XP (split evenly across all branches)
        ...(xpReward > 0
          ? [
              this.prisma.userStats.update({
                where: { userId: entry.userId },
                data: {
                  strategyXp: { increment: Math.floor(xpReward / 5) },
                  logicXp: { increment: Math.floor(xpReward / 5) },
                  eruditionXp: { increment: Math.floor(xpReward / 5) },
                  rhetoricXp: { increment: Math.floor(xpReward / 5) },
                  intuitionXp: { increment: Math.floor(xpReward / 5) },
                },
              }),
            ]
          : []),
      ]);

      rewardsGiven++;
    }

    // 3. Reset all ratings to default (soft reset: move toward 1000)
    await this.prisma.$executeRaw`
      UPDATE user_stats SET
        rating = ${DEFAULT_RATING} + FLOOR((rating - ${DEFAULT_RATING}) * 0.5),
        "logicRating" = ${DEFAULT_RATING} + FLOOR(("logicRating" - ${DEFAULT_RATING}) * 0.5),
        "eruditionRating" = ${DEFAULT_RATING} + FLOOR(("eruditionRating" - ${DEFAULT_RATING}) * 0.5),
        "strategyRating" = ${DEFAULT_RATING} + FLOOR(("strategyRating" - ${DEFAULT_RATING}) * 0.5),
        "rhetoricRating" = ${DEFAULT_RATING} + FLOOR(("rhetoricRating" - ${DEFAULT_RATING}) * 0.5),
        "intuitionRating" = ${DEFAULT_RATING} + FLOOR(("intuitionRating" - ${DEFAULT_RATING}) * 0.5)
    `;

    // 4. Close current season
    await this.prisma.season.update({
      where: { id: activeSeason.id },
      data: { isActive: false },
    });

    // 5. Create next season
    const nextStart = new Date(activeSeason.endDate);
    nextStart.setDate(nextStart.getDate() + 1);
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setDate(0); // last day of that month

    const seasonNumber = activeSeason.name.match(/Сезон (\d+)/);
    const nextNumber = seasonNumber?.[1] ? parseInt(seasonNumber[1], 10) + 1 : 2;
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const nextName = `Сезон ${nextNumber} — ${monthNames[nextStart.getMonth()]} ${nextStart.getFullYear()}`;

    await this.prisma.season.create({
      data: {
        name: nextName,
        startDate: nextStart,
        endDate: nextEnd,
        isActive: true,
      },
    });

    // 6. Invalidate caches
    await this.redis.invalidatePattern('leaderboard:*');
    await this.redis.invalidatePattern('stats:*');

    this.logger.log(`Season ended. ${rewardsGiven} rewards given. Next: ${nextName}`);
    return { seasonId: activeSeason.id, rewardsGiven };
  }
}
