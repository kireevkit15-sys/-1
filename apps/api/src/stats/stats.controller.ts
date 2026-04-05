import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  async getMyStats(@Request() req: any) {
    return this.statsService.getUserStats(req.user.sub);
  }

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
