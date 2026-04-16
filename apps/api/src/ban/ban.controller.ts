import {
  Controller, Get, Post, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import { AdminGuard } from '../common/guards/admin.guard';
import { BanService } from './ban.service';

@ApiTags('Bans')
@Controller('bans')
export class BanController {
  constructor(private readonly banService: BanService) {}

  @ApiOperation({ summary: 'Забанить пользователя (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Пользователь забанен' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async ban(
    @Body() body: {
      userId: string;
      reason: string;
      type: 'TEMPORARY' | 'PERMANENT';
      durationHours?: number;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.banService.banUser({ ...body, issuedBy: req.user.sub });
  }

  @ApiOperation({ summary: 'Снять бан (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID бана' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/lift')
  async lift(@Param('id') id: string) {
    return this.banService.liftBan(id);
  }

  @ApiOperation({ summary: 'Список активных банов (админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('active')
  async activeBans() {
    return this.banService.getActiveBans();
  }

  @ApiOperation({ summary: 'Ожидающие апелляции (админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('appeals')
  async pendingAppeals() {
    return this.banService.getPendingAppeals();
  }

  @ApiOperation({ summary: 'Рассмотреть апелляцию (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID бана' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/appeal/review')
  async reviewAppeal(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.banService.reviewAppeal(id, body.decision);
  }

  @ApiOperation({ summary: 'Мои баны' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async myBans(@Request() req: AuthenticatedRequest) {
    return this.banService.getUserBans(req.user.sub);
  }

  @ApiOperation({ summary: 'Проверить активный бан' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/active')
  async myActiveBan(@Request() req: AuthenticatedRequest) {
    const ban = await this.banService.getActiveBan(req.user.sub);
    return { banned: !!ban, ban };
  }

  @ApiOperation({ summary: 'Подать апелляцию на бан' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID бана' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/appeal')
  async submitAppeal(
    @Param('id') id: string,
    @Body() body: { appealText: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.banService.submitAppeal(id, req.user.sub, body.appealText);
  }
}
