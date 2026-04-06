import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    category?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.difficulty) where.difficulty = filters.difficulty;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async bulkCreate(questions: CreateQuestionDto[]) {
    const created = await this.prisma.question.createMany({
      data: questions.map((q) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        category: q.category,
        branch: q.branch,
        difficulty: q.difficulty,
        statPrimary: q.statPrimary,
        statSecondary: q.statSecondary || null,
        explanation: q.explanation || '',
      })),
    });

    return { count: created.count };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async create(dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        text: dto.text,
        options: dto.options,
        correctIndex: dto.correctIndex,
        category: dto.category,
        branch: dto.branch,
        difficulty: dto.difficulty,
        statPrimary: dto.statPrimary,
        statSecondary: dto.statSecondary || null,
        explanation: dto.explanation || '',
      },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getRandomForBattle(params: {
    branch?: string;
    difficulty?: string;
    category?: string;
    excludeIds?: string[];
    count?: number;
  }) {
    const count = params.count || 5;

    const where: any = { isActive: true };
    if (params.branch) where.branch = params.branch;
    if (params.difficulty) where.difficulty = params.difficulty;
    if (params.category) where.category = params.category;
    if (params.excludeIds?.length) {
      where.id = { notIn: params.excludeIds };
    }

    const questions = await this.prisma.question.findMany({ where });

    return this.shuffleArray(questions).slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = temp;
    }
    return arr;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.correctIndex !== undefined && { correctIndex: dto.correctIndex }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.branch !== undefined && { branch: dto.branch }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.statPrimary !== undefined && { statPrimary: dto.statPrimary }),
        ...(dto.statSecondary !== undefined && { statSecondary: dto.statSecondary }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
      },
    });
  }
}
