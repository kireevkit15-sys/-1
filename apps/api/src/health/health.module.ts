import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [HealthController],
})
export class HealthModule {}
