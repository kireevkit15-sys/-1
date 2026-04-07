import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { LeaderboardService } from './leaderboard.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule],
  controllers: [StatsController],
  providers: [StatsService, LeaderboardService],
  exports: [StatsService, LeaderboardService],
})
export class StatsModule {}
