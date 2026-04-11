import { Module, forwardRef } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { LeaderboardService } from './leaderboard.service';
import { SeasonService } from './season.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule, forwardRef(() => AchievementsModule)],
  controllers: [StatsController],
  providers: [StatsService, LeaderboardService, SeasonService],
  exports: [StatsService, LeaderboardService, SeasonService],
})
export class StatsModule {}
