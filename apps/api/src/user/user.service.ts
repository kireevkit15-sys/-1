import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardService } from '../stats/leaderboard.service';
import type { UpdateUserDto } from './dto/update-user.dto';
import { determineThinkerClass, getBranchLevels, xpToNextLevel } from '@razum/shared';

interface XpFields {
  logicXp: number;
  eruditionXp: number;
  strategyXp: number;
  rhetoricXp: number;
  intuitionXp: number;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

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
        ...(dto.onboardingCompleted !== undefined && { onboardingCompleted: dto.onboardingCompleted }),
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
            thinkerClass: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const enrichedStats = user.stats ? this.enrichStats(user.stats) : null;

    // Calculate thinker class if not stored yet
    const thinkerClass = user.stats
      ? user.stats.thinkerClass ??
        determineThinkerClass({
          logic: user.stats.logicXp,
          erudition: user.stats.eruditionXp,
          strategy: user.stats.strategyXp,
          rhetoric: user.stats.rhetoricXp,
          intuition: user.stats.intuitionXp,
        })
      : null;

    const [battleStats, position] = await Promise.all([
      this.getBattleStats(userId),
      this.leaderboardService.getMyPosition(userId, 'rating', 'all'),
    ]);

    return {
      ...user,
      stats: enrichedStats,
      thinkerClass,
      leaderboardRank: position.rank,
      battleStats,
    };
  }

  async compareProfiles(myId: string, otherId: string) {
    const statsSelect = {
      rating: true as const,
      streakDays: true as const,
      thinkerClass: true as const,
      logicXp: true as const,
      eruditionXp: true as const,
      strategyXp: true as const,
      rhetoricXp: true as const,
      intuitionXp: true as const,
      logicRating: true as const,
      eruditionRating: true as const,
      strategyRating: true as const,
      rhetoricRating: true as const,
      intuitionRating: true as const,
    };

    const [me, other] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: myId },
        select: {
          id: true, name: true, avatarUrl: true, createdAt: true,
          stats: { select: statsSelect },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: otherId },
        select: {
          id: true, name: true, avatarUrl: true, createdAt: true,
          stats: { select: statsSelect },
        },
      }),
    ]);

    if (!me) throw new NotFoundException('Your profile not found');
    if (!other) throw new NotFoundException('User not found');

    const buildProfile = async (user: typeof me) => {
      const stats = user!.stats;
      if (!stats) {
        return {
          id: user!.id,
          name: user!.name,
          avatarUrl: user!.avatarUrl,
          stats: null,
          thinkerClass: null,
          battleStats: { total: 0, wins: 0, losses: 0, winRate: 0 },
        };
      }

      const statsData = {
        logic: stats.logicXp,
        erudition: stats.eruditionXp,
        strategy: stats.strategyXp,
        rhetoric: stats.rhetoricXp,
        intuition: stats.intuitionXp,
      };

      const branchLevels = getBranchLevels(statsData);
      const thinkerClass = stats.thinkerClass ?? determineThinkerClass(statsData);
      const battleStats = await this.getBattleStats(user!.id);

      return {
        id: user!.id,
        name: user!.name,
        avatarUrl: user!.avatarUrl,
        stats: {
          rating: stats.rating,
          totalXp: this.calculateTotalXp(stats),
          level: branchLevels.overall,
          streakDays: stats.streakDays,
          branchLevels,
          branchXp: {
            logic: stats.logicXp,
            erudition: stats.eruditionXp,
            strategy: stats.strategyXp,
            rhetoric: stats.rhetoricXp,
            intuition: stats.intuitionXp,
          },
          branchRatings: {
            logic: stats.logicRating,
            erudition: stats.eruditionRating,
            strategy: stats.strategyRating,
            rhetoric: stats.rhetoricRating,
            intuition: stats.intuitionRating,
          },
        },
        thinkerClass,
        battleStats,
      };
    };

    const [myProfile, otherProfile] = await Promise.all([
      buildProfile(me),
      buildProfile(other),
    ]);

    // Head-to-head record
    const [h2hWins, h2hLosses] = await Promise.all([
      this.prisma.battle.count({
        where: {
          winnerId: myId,
          status: 'COMPLETED',
          OR: [
            { player1Id: myId, player2Id: otherId },
            { player1Id: otherId, player2Id: myId },
          ],
        },
      }),
      this.prisma.battle.count({
        where: {
          winnerId: otherId,
          status: 'COMPLETED',
          OR: [
            { player1Id: myId, player2Id: otherId },
            { player1Id: otherId, player2Id: myId },
          ],
        },
      }),
    ]);

    return {
      me: myProfile,
      opponent: otherProfile,
      headToHead: {
        myWins: h2hWins,
        opponentWins: h2hLosses,
        draws: 0,
      },
    };
  }

  async deleteMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Soft-delete: mark as deleted, anonymize PII
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        name: 'Удалённый пользователь',
        email: null,
        telegramId: null,
        telegramChatId: null,
        passwordHash: null,
        avatarUrl: null,
      },
    });

    return { message: 'Account deleted successfully' };
  }

  // ── XP / Level helpers ──────────────────────────

  private calculateTotalXp(stats: XpFields): number {
    return (
      stats.logicXp +
      stats.eruditionXp +
      stats.strategyXp +
      stats.rhetoricXp +
      stats.intuitionXp
    );
  }

  private enrichStats<T extends XpFields>(stats: T) {
    const totalXp = this.calculateTotalXp(stats);
    const statsData = {
      logic: stats.logicXp,
      erudition: stats.eruditionXp,
      strategy: stats.strategyXp,
      rhetoric: stats.rhetoricXp,
      intuition: stats.intuitionXp,
    };

    const branchLevels = getBranchLevels(statsData);
    const branchProgress = {
      logic: xpToNextLevel(stats.logicXp),
      erudition: xpToNextLevel(stats.eruditionXp),
      strategy: xpToNextLevel(stats.strategyXp),
      rhetoric: xpToNextLevel(stats.rhetoricXp),
      intuition: xpToNextLevel(stats.intuitionXp),
    };

    return {
      ...stats,
      totalXp,
      level: branchLevels.overall,
      branchLevels,
      branchProgress,
      xpProgress: xpToNextLevel(totalXp),
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

  // ── B19.7: GDPR export/import ──────────────────────────────

  /**
   * Export all user data as JSON (GDPR data portability).
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
        moduleProgress: true,
        achievements: { include: { achievement: true } },
        warmupResults: { orderBy: { createdAt: 'desc' } },
        aiDialogues: { orderBy: { createdAt: 'desc' } },
        referralsMade: { select: { id: true, createdAt: true, xpRewarded: true } },
        referralsReceived: { select: { id: true, createdAt: true } },
        seasonRewards: {
          include: { season: { select: { name: true, startDate: true, endDate: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get battle history
    const battles = await this.prisma.battle.findMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
      include: {
        rounds: { where: { attackerId: userId } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Get question feedbacks
    const feedbacks = await this.prisma.questionFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const { passwordHash, ...safeUser } = user;

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      user: safeUser,
      battles: battles.map(b => ({
        id: b.id,
        status: b.status,
        mode: b.mode,
        startedAt: b.startedAt,
        endedAt: b.endedAt,
        won: b.winnerId === userId,
        rounds: b.rounds,
      })),
      feedbacks,
    };
  }

  /**
   * Import user profile data (name, avatarUrl only — stats are not importable).
   */
  async importUserData(userId: string, data: { name?: string; avatarUrl?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
      },
      select: { id: true, name: true, avatarUrl: true, createdAt: true },
    });
  }
}
