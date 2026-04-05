import { Module } from '@nestjs/common';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleGateway } from './battle.gateway';
import { MatchmakingService } from './matchmaking.service';
import { BotService } from './bot.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BattleController],
  providers: [
    BattleService,
    BattleGateway,
    MatchmakingService,
    BotService,
  ],
  exports: [BattleService],
})
export class BattleModule {}
