import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserStats(userId: string) {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            rating: true,
            level: true,
          },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException('Stats not found for this user');
    }

    return stats;
  }

  async getLeaderboard(limit: number, offset: number) {
    const safeLimit = Math.min(limit, 100);

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        rating: true,
        level: true,
        stats: {
          select: {
            totalBattles: true,
            wins: true,
            winStreak: true,
            bestWinStreak: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
      take: safeLimit,
      skip: offset,
    });

    return {
      leaderboard: users.map((user, index) => ({
        rank: offset + index + 1,
        ...user,
      })),
    };
  }
}
