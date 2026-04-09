import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import type { StatsService } from './stats.service';
import type { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

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

  @ApiOperation({ summary: 'Слабые ветки и категории (по % правильных ответов)' })
  @ApiResponse({ status: 200, description: 'Анализ слабых мест: ветки и категории с низкой точностью' })
  @Get('me/weaknesses')
  async getMyWeaknesses(@Request() req: any) {
    return this.statsService.getWeaknesses(req.user.sub);
  }

  @ApiOperation({ summary: 'Рекомендации модулей для прокачки слабых веток' })
  @ApiResponse({ status: 200, description: 'Модули и категории для тренировки' })
  @Get('me/recommendations')
  async getMyRecommendations(@Request() req: any) {
    return this.statsService.getRecommendations(req.user.sub);
  }

  @ApiOperation({ summary: 'Лидерборд (с Redis-кешем 5 мин)' })
  @ApiQuery({ name: 'type', required: false, enum: ['rating', 'xp', 'streak'], description: 'Тип сортировки' })
  @ApiQuery({ name: 'period', required: false, enum: ['all', 'week', 'month'], description: 'Период' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество (по умолчанию 20)' })
  @ApiResponse({ status: 200, description: 'Топ игроков' })
  @Get('leaderboard')
  async getLeaderboard(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getLeaderboard(
      (type as 'rating' | 'xp' | 'streak') || 'rating',
      (period as 'all' | 'week' | 'month') || 'all',
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @ApiOperation({ summary: 'Моя позиция в лидерборде' })
  @ApiQuery({ name: 'type', required: false, enum: ['rating', 'xp', 'streak'] })
  @ApiQuery({ name: 'period', required: false, enum: ['all', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Позиция пользователя в рейтинге' })
  @Get('leaderboard/me')
  async getMyPosition(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('period') period?: string,
  ) {
    return this.leaderboardService.getMyPosition(
      req.user.sub,
      (type as 'rating' | 'xp' | 'streak') || 'rating',
      (period as 'all' | 'week' | 'month') || 'all',
    );
  }
}
