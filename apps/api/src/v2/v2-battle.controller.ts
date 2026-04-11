import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * V2 Battle controller — wraps responses in { data, meta } envelope.
 */
@ApiTags('v2/Battles')
@Controller('battles')
export class V2BattleController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'История баттлов пользователя (v2 — с пагинацией в meta)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('history')
  async history(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10));
    const take = Math.min(50, Math.max(1, parseInt(limit ?? '20', 10)));
    const skip = (pageNum - 1) * take;

    const [battles, total] = await this.prisma.$transaction([
      this.prisma.battle.findMany({
        where: {
          OR: [{ player1Id: req.user.sub }, { player2Id: req.user.sub }],
          status: 'COMPLETED',
        },
        include: {
          player1: { select: { id: true, name: true, avatarUrl: true } },
          player2: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { endedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.battle.count({
        where: {
          OR: [{ player1Id: req.user.sub }, { player2Id: req.user.sub }],
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      data: battles,
      meta: {
        version: 'v2',
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @ApiOperation({ summary: 'Детали баттла (v2 envelope)' })
  @ApiParam({ name: 'id', description: 'UUID баттла' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, name: true, avatarUrl: true } },
        player2: { select: { id: true, name: true, avatarUrl: true } },
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });

    return {
      data: battle,
      meta: {
        version: 'v2',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
