import { Module } from '@nestjs/common';
import { TelegramNotificationService } from './telegram-notification.service';

// Telegram module — stub (nestjs-telegraf not installed)
@Module({
  providers: [TelegramNotificationService],
  exports: [TelegramNotificationService],
})
export class TelegramModule {}
