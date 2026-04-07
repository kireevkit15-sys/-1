import { Injectable, Logger } from '@nestjs/common';
import { Update, Start, Help, Command, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const telegramId = BigInt(ctx.from!.id);
    const chatId = BigInt(ctx.chat!.id);

    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      // Save chatId for notifications if not stored yet
      if (!user.telegramChatId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: chatId },
        });
      }

      await ctx.replyWithHTML(
        `<b>РАЗУМ</b>\n\n` +
          `Привет, ${user.name}! Ты уже в системе.\n\n` +
          `Команды:\n` +
          `/profile — твой профиль и статистика\n` +
          `/battle — начать баттл\n` +
          `/leaderboard — таблица лидеров\n` +
          `/notifications — настройки уведомлений\n` +
          `/help — помощь`,
      );
    } else {
      // Deep-link: /start <payload> for referrals
      const payload = (ctx as any).startPayload as string | undefined;
      const referralNote = payload ? `\n\nТебя пригласил друг! Реферальный код: <code>${payload}</code>` : '';

      await ctx.replyWithHTML(
        `<b>РАЗУМ</b> — интеллектуальная платформа\n\n` +
          `Добро пожаловать! Чтобы начать:\n` +
          `1. Зарегистрируйся на сайте\n` +
          `2. Войди через Telegram\n` +
          `3. Возвращайся сюда для уведомлений о баттлах и достижениях${referralNote}`,
      );
    }
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.replyWithHTML(
      `<b>Команды РАЗУМ-бота:</b>\n\n` +
        `/start — начало работы\n` +
        `/profile — профиль, уровень, рейтинг\n` +
        `/battle — начать баттл со случайным соперником\n` +
        `/leaderboard — топ-10 игроков\n` +
        `/notifications — вкл/выкл уведомления\n` +
        `/invite — получить ссылку-приглашение\n` +
        `/help — эта справка`,
    );
  }

  @Command('profile')
  async onProfile(@Ctx() ctx: Context) {
    const user = await this.findUser(ctx);
    if (!user) return;

    const stats = await this.statsService.getUserStats(user.id);
    const battleStats = await this.statsService.getBattleStats(user.id);

    const bar = (xp: number, max: number) => {
      const filled = Math.round((xp / Math.max(max, 1)) * 10);
      return '▓'.repeat(filled) + '░'.repeat(10 - filled);
    };

    await ctx.replyWithHTML(
      `<b>${user.name}</b> — Уровень ${stats.level}\n` +
        `Рейтинг: ${stats.rating}\n\n` +
        `<b>Характеристики:</b>\n` +
        `Логика:    ${bar(stats.logicXp, 1000)} ${stats.logicXp}\n` +
        `Эрудиция:  ${bar(stats.eruditionXp, 1000)} ${stats.eruditionXp}\n` +
        `Стратегия: ${bar(stats.strategyXp, 1000)} ${stats.strategyXp}\n` +
        `Риторика:  ${bar(stats.rhetoricXp, 1000)} ${stats.rhetoricXp}\n` +
        `Интуиция:  ${bar(stats.intuitionXp, 1000)} ${stats.intuitionXp}\n\n` +
        `<b>Баттлы:</b> ${battleStats.total} (${battleStats.wins}W / ${battleStats.losses}L)\n` +
        `Винрейт: ${battleStats.winRate}%\n` +
        `Стрик: ${stats.streakDays} дней`,
    );
  }

  @Command('battle')
  async onBattle(@Ctx() ctx: Context) {
    const user = await this.findUser(ctx);
    if (!user) return;

    // TODO: replace with actual frontend URL from config
    const webUrl = process.env.WEB_URL || 'https://razum.app';

    await ctx.replyWithHTML(
      `Готов к баттлу?\n\n` +
        `<a href="${webUrl}/battle/new">Найти соперника</a>\n\n` +
        `Или открой приложение и нажми "Найти соперника"`,
    );
  }

  @Command('leaderboard')
  async onLeaderboard(@Ctx() ctx: Context) {
    const result = await this.statsService.getLeaderboard(10, 0);
    const lines = result.leaderboard.map(
      (entry, i) =>
        `${this.medal(i)} <b>${entry.user.name}</b> — ${entry.rating} (Ур. ${entry.level})`,
    );

    await ctx.replyWithHTML(
      `<b>Топ-10 игроков:</b>\n\n${lines.join('\n')}`,
    );
  }

  @Command('invite')
  async onInvite(@Ctx() ctx: Context) {
    const user = await this.findUser(ctx);
    if (!user) return;

    const botUsername = (ctx as any).botInfo?.username ?? 'razum_bot';
    const inviteLink = `https://t.me/${botUsername}?start=ref_${user.id.slice(0, 8)}`;

    await ctx.replyWithHTML(
      `<b>Пригласи друга в РАЗУМ!</b>\n\n` +
        `Твоя ссылка:\n${inviteLink}\n\n` +
        `Отправь её другу — он получит бонус при регистрации.`,
    );
  }

  @Command('notifications')
  async onNotifications(@Ctx() ctx: Context) {
    const user = await this.findUser(ctx);
    if (!user) return;

    const hasChat = !!user.telegramChatId;
    if (hasChat) {
      await ctx.replyWithHTML(
        `Уведомления <b>включены</b>.\n\n` +
          `Ты будешь получать:\n` +
          `— Результаты баттлов\n` +
          `— Новые достижения\n` +
          `— Напоминание о ежедневной разминке\n\n` +
          `Чтобы отключить, напиши /notifications_off`,
      );
    } else {
      await ctx.replyWithHTML(
        `Уведомления <b>отключены</b>.\n` +
          `Напиши /start чтобы активировать.`,
      );
    }
  }

  @Command('notifications_off')
  async onNotificationsOff(@Ctx() ctx: Context) {
    const user = await this.findUser(ctx);
    if (!user) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: null },
    });

    await ctx.reply('Уведомления отключены. Напиши /start чтобы включить снова.');
  }

  // ── Helpers ──────────────────────────────────

  private async findUser(ctx: Context) {
    const telegramId = BigInt(ctx.from!.id);
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      await ctx.replyWithHTML(
        `Ты ещё не зарегистрирован в РАЗУМ.\n` +
          `Зайди на сайт и войди через Telegram.`,
      );
      return null;
    }

    // Ensure chatId is saved
    if (!user.telegramChatId && ctx.chat) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: BigInt(ctx.chat.id) },
      });
    }

    return user;
  }

  private medal(index: number): string {
    const medals = ['1.', '2.', '3.'];
    return medals[index] ?? `${index + 1}.`;
  }
}
