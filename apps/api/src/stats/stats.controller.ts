import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
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
  @Get('me')
  async getMyStats(@Request() req: any) {
    return this.statsService.getUserStats(req.user.sub);
  }

  @ApiOperation({ summary: 'Моя статистика батлов (wins/losses/winRate)' })
  @Get('me/battles')
  async getMyBattleStats(@Request() req: any) {
    return this.statsService.getBattleStats(req.user.sub);
  }

  @ApiOperation({ summary: 'Лидерборд' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
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
