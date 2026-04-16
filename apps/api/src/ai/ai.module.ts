import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { LlmEngineService } from './llm-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [PrismaModule, RedisModule, KnowledgeModule],
  controllers: [AiController],
  providers: [AiService, LlmEngineService],
  exports: [AiService, LlmEngineService],
})
export class AiModule {}
