import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { BarrierService } from './barrier.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [LearningController],
  providers: [LearningService, BarrierService],
  exports: [LearningService, BarrierService],
})
export class LearningModule {}
