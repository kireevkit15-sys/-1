import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AchievementCategory } from '@prisma/client';

interface AchievementCondition {
  type: 'wins' | 'battles' | 'streak' | 'level' | 'questions_answered' | 'modules_completed' | 'pvp_battles';
  threshold: number;
}

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const newlyUnlocked: string[] = [];

    for (const achievement of achievements) {
      const condition = achievement.condition as unknown as AchievementCondition;

      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
      });

      if (existing?.unlockedAt) continue;

      const unlocked = currentValue >= condition.threshold;

      await this.prisma.userAchievement.upsert({
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
      });

      if (unlocked && !existing?.unlockedAt) {
        newlyUnlocked.push(achievement.code);

        if (achievement.xpReward > 0) {
          await this.prisma.userStats.update({
            where: { userId },
            data: { eruditionXp: { increment: achievement.xpReward } },
          });
        }
      }
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
