import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import type { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { getErrorMessage } from '../common/utils/error.util';

export interface AchievementNotification {
  userId: string;
  achievementName: string;
  achievementIcon: string;
  xpReward: number;
}

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
  ) {
    this.enabled = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    if (!this.enabled) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — telegram notifications are no-op');
    }
  }

  async sendAchievementNotification(notification: AchievementNotification): Promise<void> {
    const chatId = await this.resolveChatId(notification.userId);
    if (!chatId) return;

    const text = [
      `🏅 Новое достижение!`,
      '',
      `${notification.achievementIcon} ${notification.achievementName}`,
      `✨ +${notification.xpReward} XP`,
    ].join('\n');

    await this.send(chatId, text);
  }

  async sendAchievementUnlocked(userId: string, data: Record<string, unknown>): Promise<void> {
    const chatId = await this.resolveChatId(userId);
    if (!chatId) return;

    const name = typeof data.name === 'string' ? data.name : 'Достижение';
    const icon = typeof data.icon === 'string' ? data.icon : '🏅';
    await this.send(chatId, `${icon} Разблокировано: ${name}`);
  }

  async sendInviteAccepted(userId: string, inviteeName: string): Promise<void> {
    const chatId = await this.resolveChatId(userId);
    if (!chatId) return;
    await this.send(chatId, `🎉 ${inviteeName} присоединился к РАЗУМу по твоей ссылке.`);
  }

  async sendBattleResult(userId: string, message: string): Promise<void> {
    // Used by TelegramDigestService to deliver periodic digests.
    const chatId = await this.resolveChatId(userId);
    if (!chatId) return;
    await this.send(chatId, message);
  }

  private async resolveChatId(userId: string): Promise<bigint | null> {
    if (!this.enabled) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, deletedAt: true },
    });
    if (!user || user.deletedAt || !user.telegramChatId) return null;
    return user.telegramChatId;
  }

  private async send(chatId: bigint, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(Number(chatId), text, {
        link_preview_options: { is_disabled: true },
      });
    } catch (err: unknown) {
      this.logger.warn(`Telegram send failed for chat ${chatId}: ${getErrorMessage(err)}`);
    }
  }
}
