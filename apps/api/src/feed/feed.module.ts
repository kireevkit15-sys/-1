import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedAlgorithmService } from './feed-algorithm.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FeedController],
  providers: [FeedService, FeedAlgorithmService],
  exports: [FeedService, FeedAlgorithmService],
})
export class FeedModule {}
