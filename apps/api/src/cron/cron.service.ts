import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LeaderboardService } from '../stats/leaderboard.service';
import { SeasonService } from '../stats/season.service';
import { TelegramDigestService } from '../telegram/telegram-digest.service';
import { getErrorMessage } from '../common/utils/error.util';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly leaderboard: LeaderboardService,
    private readonly seasonService: SeasonService,
    private readonly digest: TelegramDigestService,
  ) {}

  // ── Leaderboard warm-up: every 5 minutes ──────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async warmUpLeaderboard() {
    this.logger.log('Cron: warming up leaderboard cache');
    try {
      await Promise.all([
        this.leaderboard.getLeaderboard('rating', 'all', 20),
        this.leaderboard.getLeaderboard('xp', 'all', 20),
        this.leaderboard.getLeaderboard('streak', 'all', 20),
      ]);
      this.logger.log('Cron: leaderboard cache warmed');
    } catch (err: unknown) {
      this.logger.error(`Cron: leaderboard warm-up failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Session cleanup: every hour ───────────────────────────────────
  // Removes stale matchmaking keys and expired battle mappings from Redis.

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleSessions() {
    this.logger.log('Cron: cleaning up stale sessions');
    try {
      let cleaned = 0;

      // 1. Clean stale matchmaking joined-keys (TTL should handle this,
      //    but belt-and-suspenders for keys without TTL)
      cleaned += await this.redis.invalidatePattern('matchmaking:joined:*');

      // 2. Clean stale active-battle keys where the battle is already completed
      const activeBattleKeys = await this.scanKeys('battle:active:*');
      for (const key of activeBattleKeys) {
        const battleId = await this.redis.get(key);
        if (!battleId) continue;

        const battle = await this.prisma.battle.findUnique({
          where: { id: battleId },
          select: { status: true },
        });

        if (!battle || battle.status === 'COMPLETED' || battle.status === 'ABANDONED') {
          await this.redis.del(key);
          cleaned++;
        }
      }

      this.logger.log(`Cron: cleaned ${cleaned} stale session keys`);
    } catch (err: unknown) {
      this.logger.error(`Cron: session cleanup failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Abandoned battles: every 10 minutes ───────────────────────────
  // Mark battles stuck in WAITING/ACTIVE for >1 hour as ABANDONED.

  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupAbandonedBattles() {
    this.logger.log('Cron: checking for abandoned battles');
    try {
      const ABANDONED_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
      const oneHourAgo = new Date(Date.now() - ABANDONED_THRESHOLD_MS);

      const result = await this.prisma.battle.updateMany({
        where: {
          status: { in: ['WAITING', 'ACTIVE'] },
          startedAt: { lt: oneHourAgo },
        },
        data: {
          status: 'ABANDONED',
          endedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cron: marked ${result.count} battles as abandoned`);
      }
    } catch (err: unknown) {
      this.logger.error(`Cron: abandoned battle cleanup failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Daily: reset challenge rotation cache at 00:05 UTC ────────────

  @Cron('5 0 * * *')
  async dailyRotation() {
    this.logger.log('Cron: daily rotation — clearing challenge and leaderboard caches');
    try {
      // Clear challenge-related caches
      await this.redis.invalidatePattern('challenge:*');

      // Clear leaderboard caches so fresh data is picked up
      await this.redis.invalidatePattern('leaderboard:*');

      // Warm up fresh leaderboard
      await this.warmUpLeaderboard();

      this.logger.log('Cron: daily rotation complete');
    } catch (err: unknown) {
      this.logger.error(`Cron: daily rotation failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Daily digest: every day at 20:00 UTC ──────────────────────────

  @Cron('0 20 * * *')
  async sendDailyDigest() {
    this.logger.log('Cron: sending daily digests');
    try {
      const sent = await this.digest.sendDigests('daily');
      this.logger.log(`Cron: daily digest sent to ${sent} users`);
    } catch (err: unknown) {
      this.logger.error(`Cron: daily digest failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Weekly digest: every Monday at 10:00 UTC ────────────────────

  @Cron('0 10 * * 1')
  async sendWeeklyDigest() {
    this.logger.log('Cron: sending weekly digests');
    try {
      const sent = await this.digest.sendDigests('weekly');
      this.logger.log(`Cron: weekly digest sent to ${sent} users`);
    } catch (err: unknown) {
      this.logger.error(`Cron: weekly digest failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Monthly digest: 1st of every month at 12:00 UTC ─────────────

  @Cron('0 12 1 * *')
  async sendMonthlyDigest() {
    this.logger.log('Cron: sending monthly digests');
    try {
      const sent = await this.digest.sendDigests('monthly');
      this.logger.log(`Cron: monthly digest sent to ${sent} users`);
    } catch (err: unknown) {
      this.logger.error(`Cron: monthly digest failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Season end: 1st of every month at 00:10 UTC ───────────────────

  @Cron('10 0 1 * *')
  async endSeason() {
    this.logger.log('Cron: checking if season needs to end');
    try {
      const result = await this.seasonService.endCurrentSeason();
      if (result) {
        this.logger.log(`Cron: season ended. ${result.rewardsGiven} rewards given`);
      } else {
        this.logger.log('Cron: no active season to end');
      }
    } catch (err: unknown) {
      this.logger.error(`Cron: season end failed: ${getErrorMessage(err)}`);
    }
  }

  // ── Helper ────────────────────────────────────────────────────────

  private async scanKeys(pattern: string): Promise<string[]> {
    const client = this.redis.getClient();
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }
}
