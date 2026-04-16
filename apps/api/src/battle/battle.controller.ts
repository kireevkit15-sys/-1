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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BattleService } from './battle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CreateBattleDto } from './dto/create-battle.dto';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';

@ApiTags('Battles')
@ApiBearerAuth()
@Controller('battles')
@UseGuards(JwtAuthGuard)
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  /**
   * POST /battles — Create a new battle.
   * mode='bot'  -> bot battle
   * mode='pvp'  -> PvP matchmaking battle
   */
  @ApiOperation({ summary: 'Создать новый батл (bot или pvp)' })
  @ApiResponse({ status: 201, description: 'Батл создан' })
  @ApiResponse({ status: 400, description: 'Неизвестный режим батла' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @Post()
  async createBattle(@Request() req: AuthenticatedRequest, @Body() dto: CreateBattleDto) {
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
  @ApiOperation({ summary: 'История батлов текущего пользователя' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы (по умолчанию 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество на странице (по умолчанию 10, макс 100)' })
  @ApiResponse({ status: 200, description: 'Список батлов с пагинацией' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @Get('history')
  async getHistory(
    @Request() req: AuthenticatedRequest,
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
  @ApiOperation({ summary: 'Получить состояние батла по ID' })
  @ApiParam({ name: 'id', description: 'UUID батла' })
  @ApiResponse({ status: 200, description: 'Состояние батла' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Вы не участник этого батла' })
  @ApiResponse({ status: 404, description: 'Батл не найден' })
  @Get(':id')
  async getBattle(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
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
