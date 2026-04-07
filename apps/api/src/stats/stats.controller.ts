import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @ApiOperation({ summary: 'Мои статы (с уровнем и прогрессом)' })
  @ApiResponse({ status: 200, description: 'Статы текущего пользователя с уровнем и прогрессом' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @Get('me')
  async getMyStats(@Request() req: any) {
    return this.statsService.getUserStats(req.user.sub);
  }

  @ApiOperation({ summary: 'Полная сводка профиля (уровень, рейтинг, стрик, класс мыслителя)' })
  @ApiResponse({ status: 200, description: 'Сводка профиля с классом мыслителя и статистикой батлов' })
  @Get('me/summary')
  async getMySummary(@Request() req: any) {
    return this.statsService.getSummary(req.user.sub);
  }

  @ApiOperation({ summary: 'Моя статистика батлов (wins/losses/winRate)' })
  @ApiResponse({ status: 200, description: 'Статистика батлов: победы, поражения, winRate' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @Get('me/battles')
  async getMyBattleStats(@Request() req: any) {
    return this.statsService.getBattleStats(req.user.sub);
  }

  @ApiOperation({ summary: 'Лидерборд' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество записей (по умолчанию 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Смещение (по умолчанию 0)' })
  @ApiResponse({ status: 200, description: 'Список лидеров' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.statsService.getLeaderboard(
      parseInt(limit || '50', 10),
      parseInt(offset || '0', 10),
    );
  }
}
