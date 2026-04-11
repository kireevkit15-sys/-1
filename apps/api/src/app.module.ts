import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BattleModule } from './battle/battle.module';
import { QuestionModule } from './question/question.module';
import { LearnModule } from './learn/learn.module';
import { AiModule } from './ai/ai.module';
import { StatsModule } from './stats/stats.module';
import { HealthModule } from './health/health.module';
import { WarmupModule } from './warmup/warmup.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AchievementsModule } from './achievements/achievements.module';
import { TelegramModule } from './telegram/telegram.module';
import { ReferralModule } from './referral/referral.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ChallengeModule } from './challenge/challenge.module';
import { FactsModule } from './facts/facts.module';
import { NotificationModule } from './notification/notification.module';
import { CronModule } from './cron/cron.module';
import { TournamentModule } from './tournament/tournament.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '..', '..', '.env.local'),
        join(process.cwd(), '..', '..', '.env'),
      ],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: {
          ignore: (req) =>
            ['/health', '/ready'].includes((req as { url?: string }).url ?? ''),
        },
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            id: req.id,
          }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    BattleModule,
    QuestionModule,
    LearnModule,
    AiModule,
    StatsModule,
    HealthModule,
    WarmupModule,
    KnowledgeModule,
    AchievementsModule,
    TelegramModule,
    ReferralModule,
    AnalyticsModule,
    ChallengeModule,
    FactsModule,
    NotificationModule,
    CronModule,
    TournamentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
