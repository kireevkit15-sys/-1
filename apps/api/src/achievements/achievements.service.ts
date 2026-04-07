import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { AchievementCategory } from '@prisma/client';

interface AchievementCondition {
  type: 'wins' | 'battles' | 'streak' | 'level' | 'questions_answered' | 'modules_completed' | 'pvp_battles';
  threshold: number;
}

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramNotification: TelegramNotificationService,
  ) {}

  async findAll(category?: AchievementCategory) {
    return this.prisma.achievement.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getUserAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      include: {
        users: {
          where: { userId },
        },
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });

    return achievements.map((a) => {
      const userAch = a.users[0];
      const condition = a.condition as unknown as AchievementCondition;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        threshold: condition.threshold,
        progress: userAch?.progress ?? 0,
        unlocked: !!userAch?.unlockedAt,
        unlockedAt: userAch?.unlockedAt ?? null,
      };
    });
  }

  async checkAndUpdate(
    userId: string,
    type: AchievementCondition['type'],
    currentValue: number,
  ): Promise<{ newlyUnlocked: string[] }> {
    const achievements = await this.prisma.achievement.findMany({
      where: {
        isActive: true,
        condition: { path: ['type'], equals: type },
      },
    });

    if (achievements.length === 0) return { newlyUnlocked: [] };

    // Batch-load all existing user achievements in one query instead of N queries
    const existingRecords = await this.prisma.userAchievement.findMany({
      where: {
        userId,
        achievementId: { in: achievements.map((a) => a.id) },
      },
    });

    const existingMap = new Map(
      existingRecords.map((r) => [r.achievementId, r]),
    );

    const newlyUnlocked: string[] = [];
    const upsertOps: ReturnType<typeof this.prisma.userAchievement.upsert>[] = [];
    let totalXpReward = 0;

    for (const achievement of achievements) {
      const condition = achievement.condition as unknown as AchievementCondition;
      const existing = existingMap.get(achievement.id);

      if (existing?.unlockedAt) continue;

      const unlocked = currentValue >= condition.threshold;

      upsertOps.push(
        this.prisma.userAchievement.upsert({
          where: {
            userId_achievementId: { userId, achievementId: achievement.id },
          },
          create: {
            userId,
            achievementId: achievement.id,
            progress: Math.min(currentValue, condition.threshold),
            unlockedAt: unlocked ? new Date() : null,
          },
          update: {
            progress: Math.min(currentValue, condition.threshold),
            ...(unlocked && !existing?.unlockedAt ? { unlockedAt: new Date() } : {}),
          },
        }),
      );

      if (unlocked && !existing?.unlockedAt) {
        newlyUnlocked.push(achievement.code);
        totalXpReward += achievement.xpReward;

        // Send Telegram notification (fire-and-forget)
        this.telegramNotification
          .sendAchievementUnlocked(userId, {
            achievementName: achievement.name,
            achievementIcon: achievement.icon,
            xpReward: achievement.xpReward,
          })
          .catch((err) =>
            this.logger.warn(`Failed to send achievement notification: ${(err as Error).message}`),
          );
      }
    }

    // Execute all upserts + XP reward in a single transaction
    if (upsertOps.length > 0) {
      const ops = [...upsertOps];
      if (totalXpReward > 0) {
        ops.push(
          this.prisma.userStats.update({
            where: { userId },
            data: { eruditionXp: { increment: totalXpReward } },
          }) as any,
        );
      }
      await this.prisma.$transaction(ops);
    }

    return { newlyUnlocked };
  }

  async getUnlockedCount(userId: string): Promise<{ unlocked: number; total: number }> {
    const [unlocked, total] = await Promise.all([
      this.prisma.userAchievement.count({
        where: { userId, unlockedAt: { not: null } },
      }),
      this.prisma.achievement.count({
        where: { isActive: true },
      }),
    ]);

    return { unlocked, total };
  }
}
