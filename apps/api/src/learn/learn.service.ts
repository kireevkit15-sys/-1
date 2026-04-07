import { Injectable, BadRequestException } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VALID_DIFFICULTIES = new Set<string>(['BRONZE', 'SILVER', 'GOLD']);

@Injectable()
export class LearnService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopics() {
    // Return distinct categories from questions as learning topics
    const categories = await this.prisma.question.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c: { category: string }) => ({
      id: c.category,
      name: c.category,
    }));
  }

  async startSession(userId: string, topicId: string, difficulty: string) {
    const normalized = difficulty.toUpperCase();
    if (!VALID_DIFFICULTIES.has(normalized)) {
      throw new BadRequestException(`Invalid difficulty: ${difficulty}. Must be BRONZE, SILVER, or GOLD`);
    }

    const questions = await this.prisma.question.findMany({
      where: {
        category: topicId,
        difficulty: normalized as Difficulty,
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    return {
      userId,
      topic: topicId,
      difficulty,
      questions: questions.map((q: { id: string; text: string; options: unknown; difficulty: string }) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
      })),
    };
  }
}
