import { Module, Logger, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramNotificationService } from './telegram-notification.service';
import { TelegramDigestService } from './telegram-digest.service';
import { TelegramCommandService } from './telegram-command.service';
import { TelegramUpdate } from './telegram.update';
import { PrismaModule } from '../prisma/prisma.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
          new Logger('TelegramModule').warn(
            'TELEGRAM_BOT_TOKEN not set — bot will load but polling is disabled',
          );
        }
        return {
          token: token ?? 'missing-token',
          launchOptions: token ? undefined : false,
        };
      },
    }),
    PrismaModule,
    forwardRef(() => StatsModule),
  ],
  providers: [
    TelegramNotificationService,
    TelegramDigestService,
    TelegramCommandService,
    TelegramUpdate,
  ],
  exports: [TelegramNotificationService, TelegramDigestService, TelegramCommandService],
})
export class TelegramModule {}
