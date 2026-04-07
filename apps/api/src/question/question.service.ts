import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

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

  /**
   * BC7 — Adaptive question selection with AI fallback.
   *
   * 1. Try to get questions from DB matching criteria
   * 2. If not enough — search KnowledgeService for context
   * 3. Generate missing questions via AiService using RAG context
   * 4. Save generated questions to DB for future use
   */
  async getForBattle(params: {
    branch?: 'STRATEGY' | 'LOGIC';
    difficulty?: 'BRONZE' | 'SILVER' | 'GOLD';
    category?: string;
    excludeIds?: string[];
    count?: number;
  }) {
    const count = params.count || 5;

    // Step 1: Try DB first
    const dbQuestions = await this.getRandomForBattle({
      ...params,
      count,
    });

    if (dbQuestions.length >= count) {
      this.logger.log(`getForBattle: ${count} questions from DB`);
      return dbQuestions;
    }

    this.logger.log(
      `getForBattle: only ${dbQuestions.length}/${count} from DB, generating ${count - dbQuestions.length} via AI`,
    );

    const needed = count - dbQuestions.length;
    const branch = params.branch ?? 'STRATEGY';
    const difficulty = params.difficulty ?? 'BRONZE';
    const category = params.category ?? 'Общие знания';

    // Step 2: Get RAG context from knowledge base
    let bloggerContext = '';
    try {
      bloggerContext = await this.knowledgeService.getContextForQuestion(
        category,
        branch,
        3,
      );
    } catch (err) {
      this.logger.warn('getForBattle: KnowledgeService unavailable, proceeding without context');
    }

    // Step 3: Get existing question texts for anti-duplication
    const existingTexts = dbQuestions.map((q) => q.text);

    // Step 4: Generate via AI
    try {
      const generated = await this.aiService.generateQuestions({
        categoryRu: category,
        subcategoryRu: category,
        topicRu: category,
        branch,
        difficulty,
        count: needed,
        existingQuestions: existingTexts,
        bloggerContext: bloggerContext || undefined,
      });

      // Step 5: Save generated questions to DB
      const saved = [];
      for (const q of generated) {
        try {
          const created = await this.prisma.question.create({
            data: {
              text: q.text,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              category,
              branch,
              difficulty,
              statPrimary: branch === 'STRATEGY' ? 'strategyXp' : 'logicXp',
            },
          });
          saved.push(created);
        } catch (saveErr) {
          this.logger.warn(`getForBattle: failed to save generated question: ${(saveErr as Error).message}`);
        }
      }

      this.logger.log(`getForBattle: generated ${generated.length}, saved ${saved.length}`);

      return [...dbQuestions, ...saved].slice(0, count);
    } catch (aiErr) {
      this.logger.error(`getForBattle: AI generation failed: ${(aiErr as Error).message}`);
      // Return whatever we have from DB
      return dbQuestions;
    }
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

  // ── BC8: Feedback system ─────────────────────────────────────────

  private static readonly AUTO_DEACTIVATE_REPORTS = 5;

  async submitFeedback(
    questionId: string,
    userId: string,
    type: 'LIKE' | 'DISLIKE' | 'REPORT',
    reason?: string,
    comment?: string,
  ) {
    // Verify question exists
    await this.findOne(questionId);

    // Upsert feedback (one per user per type per question)
    const feedback = await this.prisma.questionFeedback.upsert({
      where: {
        questionId_userId_type: { questionId, userId, type },
      },
      update: { reason, comment },
      create: { questionId, userId, type, reason, comment },
    });

    // Auto-review: if too many reports, deactivate question
    if (type === 'REPORT') {
      const reportCount = await this.prisma.questionFeedback.count({
        where: { questionId, type: 'REPORT' },
      });

      if (reportCount >= QuestionService.AUTO_DEACTIVATE_REPORTS) {
        await this.prisma.question.update({
          where: { id: questionId },
          data: { isActive: false },
        });
        this.logger.warn(
          `Question ${questionId} auto-deactivated: ${reportCount} reports`,
        );
      }
    }

    return feedback;
  }

  async getFeedbackStats(questionId: string) {
    const [likes, dislikes, reports] = await Promise.all([
      this.prisma.questionFeedback.count({ where: { questionId, type: 'LIKE' } }),
      this.prisma.questionFeedback.count({ where: { questionId, type: 'DISLIKE' } }),
      this.prisma.questionFeedback.count({ where: { questionId, type: 'REPORT' } }),
    ]);

    return { questionId, likes, dislikes, reports };
  }

  async getReportedQuestions(limit: number = 20) {
    const reported = await this.prisma.questionFeedback.groupBy({
      by: ['questionId'],
      where: { type: 'REPORT' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const questionIds = reported.map((r: { questionId: string }) => r.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    });

    const questionsMap = new Map(questions.map(q => [q.id, q]));

    return reported.map((r: { questionId: string; _count: { id: number } }) => ({
      question: questionsMap.get(r.questionId),
      reportCount: r._count.id,
    }));
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
