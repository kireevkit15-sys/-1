import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { TournamentService } from './tournament.service';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @ApiOperation({ summary: 'Список турниров' })
  @ApiQuery({ name: 'status', required: false, enum: ['REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @Get()
  async list(@Query('status') status?: string) {
    return this.tournamentService.list(status);
  }

  @ApiOperation({ summary: 'Детали турнира' })
  @ApiParam({ name: 'id', description: 'UUID турнира' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.tournamentService.getById(id);
  }

  @ApiOperation({ summary: 'Создать турнир (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Турнир создан' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() body: {
    name: string;
    description?: string;
    maxPlayers?: number;
    xpPrizePool?: number;
    startsAt: string;
  }) {
    return this.tournamentService.create(body);
  }

  @ApiOperation({ summary: 'Записаться на турнир' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID турнира' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.tournamentService.join(id, req.user.sub);
  }

  @ApiOperation({ summary: 'Выйти из турнира (до старта)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID турнира' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id/leave')
  async leave(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.tournamentService.leave(id, req.user.sub);
  }

  @ApiOperation({ summary: 'Запустить турнир — сидирование и генерация сетки (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID турнира' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/start')
  async start(@Param('id') id: string) {
    return this.tournamentService.start(id);
  }

  @ApiOperation({ summary: 'Записать результат матча в турнире (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID турнира' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/result')
  async recordResult(
    @Param('id') id: string,
    @Body() body: { round: number; match: number; winnerId: string },
  ) {
    return this.tournamentService.recordResult(id, body.round, body.match, body.winnerId);
  }
}
