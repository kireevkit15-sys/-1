import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LearnService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopics() {
    // Return distinct categories from questions as learning topics
    const categories = await this.prisma.question.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => ({
      id: c.category,
      name: c.category,
    }));
  }

  async startSession(userId: string, topicId: string, difficulty: string) {
    // Fetch questions for the topic and difficulty
    const questions = await this.prisma.question.findMany({
      where: {
        category: topicId,
        difficulty: difficulty.toUpperCase(),
      },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    return {
      userId,
      topic: topicId,
      difficulty,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
      })),
    };
  }
}
