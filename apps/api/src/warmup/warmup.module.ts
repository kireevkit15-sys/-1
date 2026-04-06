import { Module } from '@nestjs/common';
import { WarmupController } from './warmup.controller';
import { WarmupService } from './warmup.service';
import { AuthModule } from '../auth/auth.module';
import { QuestionModule } from '../question/question.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [AuthModule, QuestionModule, StatsModule],
  controllers: [WarmupController],
  providers: [WarmupService],
  exports: [WarmupService],
})
export class WarmupModule {}
