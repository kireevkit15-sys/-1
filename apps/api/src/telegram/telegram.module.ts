import { Module } from '@nestjs/common';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramDigestService } from './telegram-digest.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TelegramNotificationService, TelegramDigestService],
  exports: [TelegramNotificationService, TelegramDigestService],
})
export class TelegramModule {}
