import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

interface XpFields {
  logicXp: number;
  eruditionXp: number;
  strategyXp: number;
  rhetoricXp: number;
  intuitionXp: number;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string, battleLimit = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...result } = user;

    const enrichedStats = user.stats ? this.enrichStats(user.stats) : null;
    const [battleStats, recentBattles] = await Promise.all([
      this.getBattleStats(userId),
      this.getRecentBattles(userId, battleLimit),
    ]);

    return {
      ...result,
      stats: enrichedStats,
      battleStats,
      recentBattles,
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatar !== undefined && { avatarUrl: dto.avatar }),
      },
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        stats: {
          select: {
            rating: true,
            streakDays: true,
            logicXp: true,
            eruditionXp: true,
            strategyXp: true,
            rhetoricXp: true,
            intuitionXp: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrichedStats = user.stats ? this.enrichStats(user.stats) : null;
    const battleStats = await this.getBattleStats(userId);

    return {
      ...user,
      stats: enrichedStats,
      battleStats,
    };
  }

  // ── XP / Level helpers ────────��───────────────────

  private calculateTotalXp(stats: XpFields): number {
    return (
      stats.logicXp +
      stats.eruditionXp +
      stats.strategyXp +
      stats.rhetoricXp +
      stats.intuitionXp
    );
  }

  private calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100));
  }

  private calculateXpProgress(totalXp: number): {
    current: number;
    required: number;
  } {
    const level = this.calculateLevel(totalXp);
    const nextLevel = level + 1;
    return {
      current: totalXp - level * level * 100,
      required: nextLevel * nextLevel * 100 - level * level * 100,
    };
  }

  private enrichStats<T extends XpFields>(stats: T) {
    const totalXp = this.calculateTotalXp(stats);
    return {
      ...stats,
      totalXp,
      level: this.calculateLevel(totalXp),
      xpProgress: this.calculateXpProgress(totalXp),
    };
  }

  // ── Battle helpers ────────────────────────────────

  private async getBattleStats(userId: string) {
    const [total, wins] = await Promise.all([
      this.prisma.battle.count({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
      }),
      this.prisma.battle.count({
        where: { winnerId: userId, status: 'COMPLETED' },
      }),
    ]);

    const losses = total - wins;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { total, wins, losses, winRate };
  }

  private async getRecentBattles(userId: string, limit = 10) {
    const battles = await this.prisma.battle.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: 'COMPLETED',
      },
      include: {
        player1: { select: { id: true, name: true, avatarUrl: true } },
        player2: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { endedAt: 'desc' },
      take: limit,
    });

    return battles.map((b) => {
      const isPlayer1 = b.player1Id === userId;
      const opponent = isPlayer1 ? b.player2 : b.player1;
      const myScore = isPlayer1 ? b.player1Score : b.player2Score;
      const opponentScore = isPlayer1 ? b.player2Score : b.player1Score;

      return {
        id: b.id,
        opponent: opponent
          ? {
              id: opponent.id,
              name: opponent.name,
              avatarUrl: opponent.avatarUrl,
            }
          : { id: 'bot', name: 'РАЗУМ-бот', avatarUrl: null },
        myScore,
        opponentScore,
        won: b.winnerId === userId,
        endedAt: b.endedAt,
      };
    });
  }
}
