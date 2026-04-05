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
            avatarUrl: true,
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

    const users = await this.prisma.userStats.findMany({
      select: {
        userId: true,
        rating: true,
        streakDays: true,
        logicXp: true,
        eruditionXp: true,
        strategyXp: true,
        rhetoricXp: true,
        intuitionXp: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
      take: safeLimit,
      skip: offset,
    });

    return {
      leaderboard: users.map((entry, index: number) => ({
        rank: offset + index + 1,
        ...entry,
      })),
    };
  }
}
