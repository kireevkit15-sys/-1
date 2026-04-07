import { Injectable, Logger } from '@nestjs/common';

export interface AchievementNotification {
  userId: string;
  achievementName: string;
  achievementIcon: string;
  xpReward: number;
}

// Disabled — nestjs-telegraf/telegraf not installed
@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  async sendAchievementNotification(_notification: AchievementNotification): Promise<void> {
    this.logger.warn('Telegram notifications disabled — packages not installed');
  }

  async sendBattleResult(_userId: string, _message: string): Promise<void> {
    this.logger.warn('Telegram notifications disabled — packages not installed');
  }

  async sendAchievementUnlocked(_userId: string, _data: Record<string, unknown>): Promise<void> {
    this.logger.warn('Telegram notifications disabled — packages not installed');
  }

  async sendInviteAccepted(_userId: string, _inviteeName: string): Promise<void> {
    this.logger.warn('Telegram notifications disabled — packages not installed');
  }
}
