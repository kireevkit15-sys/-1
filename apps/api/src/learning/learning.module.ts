import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { ConceptController } from './concept.controller';
import { LearningService } from './learning.service';
import { BarrierService } from './barrier.service';
import { ConceptService } from './concept.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [LearningController, ConceptController],
  providers: [LearningService, BarrierService, ConceptService],
  exports: [LearningService, BarrierService, ConceptService],
})
export class LearningModule {}
