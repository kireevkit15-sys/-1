import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Branch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LearnService {
  constructor(private readonly prisma: PrismaService) {}

  /** List modules by branch with user progress and unlock status */
  async getModules(userId: string, branch: Branch) {
    const modules = await this.prisma.module.findMany({
      where: { branch },
      orderBy: { orderIndex: 'asc' },
      include: {
        progress: {
          where: { userId },
        },
      },
    });

    return modules.map((mod, idx) => {
      const userProgress = mod.progress[0];
      const totalQuestions = mod.questionIds.length;
      const completedCount = userProgress?.completedQuestions.length ?? 0;

      // Module 1 is always unlocked; others require previous module completed
      const isUnlocked =
        idx === 0 ||
        (modules[idx - 1]?.progress[0]?.completedAt != null);

      return {
        id: mod.id,
        branch: mod.branch,
        orderIndex: mod.orderIndex,
        title: mod.title,
        description: mod.description,
        totalQuestions,
        completedQuestions: completedCount,
        isCompleted: userProgress?.completedAt != null,
        isUnlocked,
      };
    });
  }

  /** Get module detail with questions (only if unlocked) */
  async getModuleById(userId: string, moduleId: string) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        progress: {
          where: { userId },
        },
      },
    });

    if (!mod) {
      throw new NotFoundException('Module not found');
    }

    // Check unlock: find previous module in same branch
    const isUnlocked = await this.isModuleUnlocked(userId, mod);
    if (!isUnlocked) {
      throw new ForbiddenException(
        'Complete the previous module to unlock this one',
      );
    }

    // Fetch questions by IDs stored in module
    const questions = await this.prisma.question.findMany({
      where: { id: { in: mod.questionIds } },
    });

    const userProgress = mod.progress[0];
    const completedIds = userProgress?.completedQuestions ?? [];

    return {
      id: mod.id,
      branch: mod.branch,
      orderIndex: mod.orderIndex,
      title: mod.title,
      description: mod.description,
      isCompleted: userProgress?.completedAt != null,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        isCompleted: completedIds.includes(q.id),
      })),
    };
  }

  /** Mark a question as completed within a module */
  async submitProgress(
    userId: string,
    moduleId: string,
    questionId: string,
  ) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!mod) {
      throw new NotFoundException('Module not found');
    }

    if (!mod.questionIds.includes(questionId)) {
      throw new BadRequestException(
        'Question does not belong to this module',
      );
    }

    const isUnlocked = await this.isModuleUnlocked(userId, mod);
    if (!isUnlocked) {
      throw new ForbiddenException(
        'Complete the previous module to unlock this one',
      );
    }

    // Upsert progress record
    const existing = await this.prisma.userModuleProgress.findUnique({
      where: {
        userId_moduleId: { userId, moduleId },
      },
    });

    const completedQuestions = existing?.completedQuestions ?? [];

    if (completedQuestions.includes(questionId)) {
      return { alreadyCompleted: true };
    }

    const updated = [...completedQuestions, questionId];
    const allDone = mod.questionIds.every((qId) => updated.includes(qId));

    await this.prisma.userModuleProgress.upsert({
      where: {
        userId_moduleId: { userId, moduleId },
      },
      update: {
        completedQuestions: updated,
        completedAt: allDone ? new Date() : null,
      },
      create: {
        userId,
        moduleId,
        completedQuestions: updated,
        completedAt: allDone ? new Date() : null,
      },
    });

    return {
      alreadyCompleted: false,
      completedQuestions: updated.length,
      totalQuestions: mod.questionIds.length,
      moduleCompleted: allDone,
    };
  }

  private async isModuleUnlocked(
    userId: string,
    mod: { branch: Branch; orderIndex: number },
  ): Promise<boolean> {
    if (mod.orderIndex === 1) return true;

    const prevModule = await this.prisma.module.findUnique({
      where: {
        branch_orderIndex: {
          branch: mod.branch,
          orderIndex: mod.orderIndex - 1,
        },
      },
      include: {
        progress: {
          where: { userId },
        },
      },
    });

    return prevModule?.progress[0]?.completedAt != null;
  }
}
