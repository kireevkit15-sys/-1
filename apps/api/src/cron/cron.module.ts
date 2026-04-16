import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { StatsModule } from '../stats/stats.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, RedisModule, StatsModule, TelegramModule, AiModule],
  providers: [CronService],
})
export class CronModule {}
