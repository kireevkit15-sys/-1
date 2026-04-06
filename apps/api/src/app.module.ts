import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
