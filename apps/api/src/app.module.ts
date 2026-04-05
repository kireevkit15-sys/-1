import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BattleModule } from './battle/battle.module';
import { QuestionModule } from './question/question.module';
import { LearnModule } from './learn/learn.module';
import { AiModule } from './ai/ai.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    BattleModule,
    QuestionModule,
    LearnModule,
    AiModule,
    StatsModule,
  ],
})
export class AppModule {}
