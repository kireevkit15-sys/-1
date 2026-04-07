import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsModule } from '../stats/stats.module';
import { TelegramUpdate } from './telegram.update';
import { TelegramNotificationService } from './telegram-notification.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('TELEGRAM_BOT_TOKEN', ''),
        launchOptions: {
          webhook: config.get<string>('TELEGRAM_WEBHOOK_URL')
            ? {
                domain: config.get<string>('TELEGRAM_WEBHOOK_URL')!,
                hookPath: '/api/telegram-webhook',
              }
            : undefined,
        },
      }),
    }),
    PrismaModule,
    StatsModule,
  ],
  providers: [TelegramUpdate, TelegramNotificationService],
  exports: [TelegramNotificationService],
})
export class TelegramModule {}
