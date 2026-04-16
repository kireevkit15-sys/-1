import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotificationService } from './telegram-notification.service';
import { getErrorMessage } from '../common/utils/error.util';

type DigestPeriod = 'daily' | 'weekly' | 'monthly';

interface DigestData {
  userId: string;
  name: string;
  telegramChatId: bigint;
  period: DigestPeriod;
  battlesPlayed: number;
  battlesWon: number;
  xpEarned: number;
  streakDays: number;
  rating: number;
  ratingChange: number;
  leaderboardRank: number | null;
}

@Injectable()
export class TelegramDigestService {
  private readonly logger = new Logger(TelegramDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramNotificationService,
  ) {}

  /**
   * Generate and send digests for all users with telegramChatId.
   */
  async sendDigests(period: DigestPeriod): Promise<number> {
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Get all users with Telegram chat ID
    const users = await this.prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        telegramChatId: true,
        stats: {
          select: {
            rating: true,
            streakDays: true,
            logicXp: true,
            eruditionXp: true,
            strategyXp: true,
            rhetoricXp: true,
            intuitionXp: true,
          },
        },
      },
    });

    let sent = 0;

    for (const user of users) {
      if (!user.telegramChatId || !user.stats) continue;

      try {
        const digest = await this.buildDigest(user.id, user.name, user.telegramChatId, user.stats, period, since);
        if (digest) {
          const message = this.formatDigest(digest);
          await this.telegram.sendBattleResult(user.id, message);
          sent++;
        }
      } catch (err: unknown) {
        this.logger.error(`Failed to send ${period} digest to ${user.name}: ${getErrorMessage(err)}`);
      }
    }

    this.logger.log(`${period} digest sent to ${sent}/${users.length} users`);
    return sent;
  }

  private async buildDigest(
    userId: string,
    name: string,
    telegramChatId: bigint,
    stats: {
      rating: number;
      streakDays: number;
      logicXp: number;
      eruditionXp: number;
      strategyXp: number;
      rhetoricXp: number;
      intuitionXp: number;
    },
    period: DigestPeriod,
    since: Date,
  ): Promise<DigestData | null> {
    // Count battles in period
    const battles = await this.prisma.battle.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        startedAt: { gte: since },
        status: 'COMPLETED',
      },
      select: { winnerId: true },
    });

    const battlesPlayed = battles.length;
    const battlesWon = battles.filter((b) => b.winnerId === userId).length;

    // Calculate XP earned in period (from warmup results)
    const warmups = await this.prisma.warmupResult.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      select: { xpEarned: true },
    });
    const warmupXp = warmups.reduce((sum, w) => sum + w.xpEarned, 0);

    // Estimate total XP earned (warmup + battle XP approximation)
    const xpEarned = warmupXp + battlesWon * 50 + (battlesPlayed - battlesWon) * 20;

    // Skip if no activity
    if (battlesPlayed === 0 && warmups.length === 0) {
      return null;
    }

    // Get leaderboard rank
    const totalXp = stats.logicXp + stats.eruditionXp + stats.strategyXp + stats.rhetoricXp + stats.intuitionXp;
    const rankResult = await this.prisma.$queryRaw<[{ rank: bigint }]>`
      SELECT COUNT(*) + 1 AS rank FROM user_stats
      WHERE ("logicXp" + "eruditionXp" + "strategyXp" + "rhetoricXp" + "intuitionXp") > ${totalXp}
    `;
    const leaderboardRank = Number(rankResult[0].rank);

    return {
      userId,
      name,
      telegramChatId,
      period,
      battlesPlayed,
      battlesWon,
      xpEarned,
      streakDays: stats.streakDays,
      rating: stats.rating,
      ratingChange: 0, // TODO(B-next): needs RatingSnapshot table to compute delta per period
      leaderboardRank,
    };
  }

  private formatDigest(d: DigestData): string {
    const periodLabel = d.period === 'daily' ? '📊 Дневной отчёт'
      : d.period === 'weekly' ? '📈 Недельный отчёт'
      : '🏆 Месячный отчёт';

    const winRate = d.battlesPlayed > 0
      ? Math.round((d.battlesWon / d.battlesPlayed) * 100)
      : 0;

    const lines = [
      `${periodLabel} — РАЗУМ`,
      '',
      `⚔️ Баттлы: ${d.battlesPlayed} (побед: ${d.battlesWon}, ${winRate}%)`,
      `✨ XP заработано: +${d.xpEarned}`,
      `🔥 Стрик: ${d.streakDays} дн.`,
      `📊 Рейтинг: ${d.rating}`,
    ];

    if (d.leaderboardRank !== null) {
      lines.push(`🏅 Позиция: #${d.leaderboardRank}`);
    }

    lines.push('', '💪 Продолжай прокачку!');

    return lines.join('\n');
  }
}
