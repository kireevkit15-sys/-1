import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { ConceptController } from './concept.controller';
import { LearningService } from './learning.service';
import { LearningAiService } from './learning-ai.service';
import { BarrierService } from './barrier.service';
import { ConceptService } from './concept.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, RedisModule, AiModule],
  controllers: [LearningController, ConceptController],
  providers: [LearningService, LearningAiService, BarrierService, ConceptService],
  exports: [LearningService, LearningAiService, BarrierService, ConceptService],
})
export class LearningModule {}
