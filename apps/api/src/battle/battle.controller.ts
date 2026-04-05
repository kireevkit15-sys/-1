import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BattleService } from './battle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBattleDto } from './dto/create-battle.dto';

@Controller('battles')
@UseGuards(JwtAuthGuard)
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  /**
   * POST /battles — Create a new battle.
   * mode='bot'  -> bot battle
   * mode='pvp'  -> PvP matchmaking battle
   */
  @Post()
  async createBattle(@Request() req: any, @Body() dto: CreateBattleDto) {
    const userId: string = req.user.sub;

    if (dto.mode === 'bot') {
      return this.battleService.createBotBattle(userId);
    }

    if (dto.mode === 'pvp') {
      return this.battleService.createPvpBattle(userId);
    }

    throw new HttpException(
      `Unknown battle mode: ${dto.mode as string}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * GET /battles/history — Paginated list of the user's completed battles.
   * Must be registered BEFORE the `:id` route so NestJS does not treat
   * "history" as a battle id.
   */
  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId: string = req.user.sub;
    const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 100);

    return this.battleService.getUserHistory(userId, pageNum, limitNum);
  }

  /**
   * GET /battles/:id — Get battle state (supports reconnection).
   * Only participants (player1 / player2) may access the battle.
   */
  @Get(':id')
  async getBattle(@Param('id') id: string, @Request() req: any) {
    const userId: string = req.user.sub;

    const battle = await this.battleService.getBattle(id);

    if (!battle) {
      throw new HttpException('Battle not found', HttpStatus.NOT_FOUND);
    }

    if (battle.player1Id !== userId && battle.player2Id !== userId) {
      throw new HttpException(
        'You are not a participant of this battle',
        HttpStatus.FORBIDDEN,
      );
    }

    return battle;
  }
}
