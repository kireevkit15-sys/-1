import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardService } from '../stats/leaderboard.service';
import { determineThinkerClass, getBranchLevels } from '@razum/shared';

/**
 * Pure message-builder service for Telegram bot commands.
 * No direct Telegraf coupling — easy to unit-test.
 */
@Injectable()
export class TelegramCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Greeting for /start. Includes rules + /privacy + /terms links (Legal.1-3).
   * Persists telegramChatId so notifications/digests can find the user later.
   */
  async buildWelcomeMessage(telegramId: bigint, telegramChatId: bigint): Promise<string> {
    const baseUrl = this.resolveWebUrl();
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, name: true, deletedAt: true },
    });

    if (user && !user.deletedAt) {
      // Re-bind chat id (user could have linked from another device)
      if (telegramChatId) {
        await this.prisma.user
          .update({
            where: { id: user.id },
            data: { telegramChatId },
          })
          .catch(() => void 0);
      }

      return [
        `👋 С возвращением, ${user.name}!`,
        '',
        'Доступные команды:',
        '/stats — твой уровень, рейтинг, стрик',
        '/leaderboard — топ-10 мыслителей',
        '/help — помощь',
      ].join('\n');
    }

    return [
      '🧠 Добро пожаловать в РАЗУМ — школу мышления.',
      '',
      'Что здесь есть:',
      '⚔️ Баттлы знаний 1-на-1 («Осада крепости»)',
      '📚 Дерево знаний: Стратегия, Логика, Эрудиция, Риторика, Интуиция',
      '🧭 AI-наставник по сократическому методу',
      '',
      'Правила: будь честен, не списывай у AI, уважай соперников.',
      '',
      `🌐 Открыть приложение: ${baseUrl}`,
      `📄 Политика конфиденциальности: ${baseUrl}/privacy`,
      `📝 Пользовательское соглашение: ${baseUrl}/terms`,
      '',
      'Зарегистрируйся в приложении через Telegram — и возвращайся сюда для статов.',
    ].join('\n');
  }

  buildHelpMessage(): string {
    return [
      '📖 Команды бота:',
      '',
      '/start — приветствие и привязка чата',
      '/stats — твой уровень, рейтинг, стрик, XP по веткам',
      '/leaderboard — топ-10 по общему XP',
      '/help — этот список',
      '',
      `🌐 Сайт: ${this.resolveWebUrl()}`,
    ].join('\n');
  }

  async buildStatsMessage(telegramId: bigint): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        name: true,
        deletedAt: true,
        stats: {
          select: {
            rating: true,
            streakDays: true,
            logicXp: true,
            eruditionXp: true,
            strategyXp: true,
            rhetoricXp: true,
            intuitionXp: true,
            thinkerClass: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return `❓ Не нашёл твой профиль. Зарегистрируйся через Telegram в ${this.resolveWebUrl()}.`;
    }

    if (!user.stats) {
      return `👤 ${user.name}\n\nСтатистики пока нет — сыграй первый баттл или пройди разминку.`;
    }

    const s = user.stats;
    const xp = {
      logic: s.logicXp,
      erudition: s.eruditionXp,
      strategy: s.strategyXp,
      rhetoric: s.rhetoricXp,
      intuition: s.intuitionXp,
    };
    const totalXp = xp.logic + xp.erudition + xp.strategy + xp.rhetoric + xp.intuition;
    const branchLevels = getBranchLevels(xp);
    const thinkerClass = s.thinkerClass ?? determineThinkerClass(xp);

    return [
      `👤 ${user.name}`,
      '',
      `🏆 Уровень: ${branchLevels.overall}`,
      `⚔️ Рейтинг: ${s.rating}`,
      `🔥 Стрик: ${s.streakDays} дн.`,
      `🧭 Класс: ${thinkerClass}`,
      '',
      `✨ Всего XP: ${totalXp}`,
      `  🧩 Логика: ${xp.logic} (lvl ${branchLevels.logic})`,
      `  📚 Эрудиция: ${xp.erudition} (lvl ${branchLevels.erudition})`,
      `  ♟️ Стратегия: ${xp.strategy} (lvl ${branchLevels.strategy})`,
      `  🗣️ Риторика: ${xp.rhetoric} (lvl ${branchLevels.rhetoric})`,
      `  🔮 Интуиция: ${xp.intuition} (lvl ${branchLevels.intuition})`,
    ].join('\n');
  }

  async buildLeaderboardMessage(limit = 10): Promise<string> {
    const board = await this.leaderboard.getLeaderboard('xp', 'all', limit);
    const entries: Array<{
      rank: number;
      user: { name: string };
      totalXp: number;
      level: number;
    }> = board.entries;

    if (!entries.length) {
      return '🏆 Лидерборд пока пуст — стань первым.';
    }

    const lines = [`🏆 Топ-${entries.length} мыслителей (по XP):`, ''];
    for (const e of entries) {
      const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`;
      lines.push(`${medal} ${e.user.name} — ${e.totalXp} XP (lvl ${e.level})`);
    }
    return lines.join('\n');
  }

  private resolveWebUrl(): string {
    return (
      this.config.get<string>('WEB_URL') ??
      this.config.get<string>('NEXTAUTH_URL') ??
      'https://razum.app'
    );
  }
}
