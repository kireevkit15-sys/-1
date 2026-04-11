import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

/**
 * V2 User controller — wraps responses in { data, meta } envelope.
 */
@ApiTags('v2/Users')
@Controller('users')
export class V2UserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  @ApiOperation({ summary: 'Профиль текущего пользователя (v2 envelope)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: { user: { sub: string } }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        onboardingCompleted: true,
        referralCode: true,
        createdAt: true,
        stats: true,
      },
    });

    return {
      data: user,
      meta: {
        version: 'v2',
        timestamp: new Date().toISOString(),
      },
    };
  }

  @ApiOperation({ summary: 'Публичный профиль (v2 envelope)' })
  @Get(':id/profile')
  async getProfile(@Request() req: { params: { id: string } }) {
    const userId = req.params.id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        stats: {
          select: {
            rating: true,
            logicXp: true,
            eruditionXp: true,
            strategyXp: true,
            rhetoricXp: true,
            intuitionXp: true,
            streakDays: true,
            thinkerClass: true,
          },
        },
      },
    });

    return {
      data: user,
      meta: {
        version: 'v2',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
