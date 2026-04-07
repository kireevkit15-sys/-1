import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

export interface AchievementNotification {
  userId: string;
  achievementName: string;
  achievementIcon: string;
  xpReward: number;
}

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
  ) {}

  async sendAchievementUnlocked(userId: string, data: Omit<AchievementNotification, 'userId'>) {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    const text =
      `${data.achievementIcon} <b>Новое достижение!</b>\n\n` +
      `<b>${data.achievementName}</b>\n` +
      (data.xpReward > 0 ? `+${data.xpReward} XP` : '');

    await this.sendMessage(chatId, text);
  }

  async sendWarmupReminder(userId: string) {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    await this.sendMessage(
      chatId,
      `<b>Ежедневная разминка ждёт!</b>\n\n` +
        `Не потеряй свой стрик — ответь на 5 вопросов.`,
    );
  }

  async sendInviteAccepted(userId: string, newUserName: string) {
    const chatId = await this.getChatId(userId);
    if (!chatId) return;

    await this.sendMessage(
      chatId,
      `<b>Твой друг ${newUserName} присоединился к РАЗУМ!</b>\n\n` +
        `Вызови его на баттл!`,
    );
  }

  // ── Private ──────────────────────────────────

  private async getChatId(userId: string): Promise<bigint | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    return user?.telegramChatId ?? null;
  }

  private async sendMessage(chatId: bigint, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId.toString(), text, {
        parse_mode: 'HTML',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send Telegram message to chatId=${chatId}: ${(err as Error).message}`,
      );
    }
  }
}
