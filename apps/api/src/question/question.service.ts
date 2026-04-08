import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Question } from '@prisma/client';
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
    branch?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.branch) where.branch = filters.branch;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

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

  async getStatsByCategory() {
    const [total, byBranch, byDifficulty, byCategory] = await Promise.all([
      this.prisma.question.count({ where: { isActive: true } }),
      this.prisma.question.groupBy({
        by: ['branch'],
        where: { isActive: true },
        _count: { id: true },
      }),
      this.prisma.question.groupBy({
        by: ['difficulty'],
        where: { isActive: true },
        _count: { id: true },
      }),
      this.prisma.question.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 30,
      }),
    ]);

    return {
      total,
      byBranch: byBranch.map((b: { branch: string; _count: { id: number } }) => ({
        branch: b.branch,
        count: b._count.id,
      })),
      byDifficulty: byDifficulty.map((d: { difficulty: string; _count: { id: number } }) => ({
        difficulty: d.difficulty,
        count: d._count.id,
      })),
      byCategory: byCategory.map((c: { category: string; _count: { id: number } }) => ({
        category: c.category,
        count: c._count.id,
      })),
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
    throwOnEmpty?: boolean;
  }): Promise<Question[]> {
    const count = params.count || 5;

    const conditions: string[] = ['"isActive" = true'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.branch) {
      conditions.push(`"branch" = $${paramIndex}::"Branch"`);
      values.push(params.branch);
      paramIndex++;
    }
    if (params.difficulty) {
      conditions.push(`"difficulty" = $${paramIndex}::"Difficulty"`);
      values.push(params.difficulty);
      paramIndex++;
    }
    if (params.category) {
      conditions.push(`"category" = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }
    if (params.excludeIds?.length) {
      conditions.push(`"id" NOT IN (${params.excludeIds.map((_, i) => `$${paramIndex + i}::uuid`).join(', ')})`);
      values.push(...params.excludeIds);
      paramIndex += params.excludeIds.length;
    }

    const whereClause = conditions.join(' AND ');

    const questions = await this.prisma.$queryRawUnsafe<Question[]>(
      `SELECT * FROM questions WHERE ${whereClause} ORDER BY RANDOM() LIMIT ${count}`,
      ...values,
    );

    // Fallback: if no questions found and difficulty filter was used, retry without it
    if (questions.length === 0 && params.difficulty) {
      this.logger.warn(
        `getRandomForBattle: 0 questions with difficulty=${params.difficulty}, retrying without difficulty filter`,
      );
      const fallback = await this.getRandomForBattle({
        ...params,
        difficulty: undefined,
        count,
      });

      if (fallback.length === 0) {
        if (params.throwOnEmpty !== false) {
          throw new HttpException(
            `No questions found for the requested filters (branch=${params.branch ?? 'any'}, category=${params.category ?? 'any'})`,
            HttpStatus.NOT_FOUND,
          );
        }
        return [];
      }

      return fallback;
    }

    return questions;
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
    branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
    difficulty?: 'BRONZE' | 'SILVER' | 'GOLD';
    category?: string;
    excludeIds?: string[];
    count?: number;
  }) {
    const count = params.count || 5;

    // Step 1: Try DB first (don't throw on empty — AI fallback below)
    const dbQuestions = await this.getRandomForBattle({
      ...params,
      count,
      throwOnEmpty: false,
    });

    if (dbQuestions.length >= count) {
      this.logger.log(`getForBattle: ${count} questions from DB`);
      return dbQuestions;
    }

    this.logger.log(
      `getForBattle: only ${dbQuestions.length}/${count} from DB, generating ${count - dbQuestions.length} via AI`,
    );

    const needed = count - dbQuestions.length;
    const branch = params.branch ?? 'ERUDITION';
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
    } catch (_err: unknown) {
      this.logger.warn('getForBattle: KnowledgeService unavailable, proceeding without context');
    }

    // Step 3: Get existing question texts for anti-duplication
    const existingTexts = dbQuestions.map((q: Question) => q.text);

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
              statPrimary: branch === 'STRATEGY' ? 'strategyXp'
              : branch === 'LOGIC' ? 'logicXp'
              : branch === 'ERUDITION' ? 'eruditionXp'
              : branch === 'RHETORIC' ? 'rhetoricXp'
              : 'intuitionXp',
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

  // ── BC9: Adaptive difficulty calibration ──────────────────────

  private static readonly MIN_ANSWERS_FOR_CALIBRATION = 20;
  private static readonly TOO_EASY_THRESHOLD = 0.85; // >85% correct → harder
  private static readonly TOO_HARD_THRESHOLD = 0.25; // <25% correct → easier

  private static readonly DIFFICULTY_UP: Record<string, string | null> = {
    BRONZE: 'SILVER',
    SILVER: 'GOLD',
    GOLD: null, // already max
  };

  private static readonly DIFFICULTY_DOWN: Record<string, string | null> = {
    GOLD: 'SILVER',
    SILVER: 'BRONZE',
    BRONZE: null, // already min
  };

  /**
   * Update answer statistics for a question after a battle round.
   * Called from BattleService.processAttack().
   */
  async updateAnswerStats(
    questionId: string,
    isCorrect: boolean,
    timeTakenMs?: number,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { totalAnswers: true, correctAnswers: true, avgTimeTakenMs: true },
    });

    if (!question) return;

    const newTotal = question.totalAnswers + 1;
    const newCorrect = question.correctAnswers + (isCorrect ? 1 : 0);

    // Incremental average for time
    let newAvgTime: number | null = question.avgTimeTakenMs;
    if (timeTakenMs != null) {
      if (question.avgTimeTakenMs == null) {
        newAvgTime = timeTakenMs;
      } else {
        // Running average: avg = old_avg + (new_value - old_avg) / count
        newAvgTime = Math.round(
          question.avgTimeTakenMs +
            (timeTakenMs - question.avgTimeTakenMs) / newTotal,
        );
      }
    }

    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        totalAnswers: newTotal,
        correctAnswers: newCorrect,
        avgTimeTakenMs: newAvgTime,
      },
    });
  }

  /**
   * Recalibrate difficulty for all questions with enough answer data.
   * Returns summary of changes made.
   */
  async recalibrateDifficulty(): Promise<{
    analyzed: number;
    adjusted: number;
    changes: Array<{
      questionId: string;
      oldDifficulty: string;
      newDifficulty: string;
      correctRate: number;
      totalAnswers: number;
    }>;
  }> {
    const questions = await this.prisma.question.findMany({
      where: {
        isActive: true,
        totalAnswers: { gte: QuestionService.MIN_ANSWERS_FOR_CALIBRATION },
      },
      select: {
        id: true,
        difficulty: true,
        totalAnswers: true,
        correctAnswers: true,
      },
    });

    const changes: Array<{
      questionId: string;
      oldDifficulty: string;
      newDifficulty: string;
      correctRate: number;
      totalAnswers: number;
    }> = [];

    for (const q of questions) {
      const correctRate = q.correctAnswers / q.totalAnswers;
      let newDifficulty: string | null = null;

      if (correctRate > QuestionService.TOO_EASY_THRESHOLD) {
        newDifficulty = QuestionService.DIFFICULTY_UP[q.difficulty] ?? null;
      } else if (correctRate < QuestionService.TOO_HARD_THRESHOLD) {
        newDifficulty = QuestionService.DIFFICULTY_DOWN[q.difficulty] ?? null;
      }

      if (newDifficulty) {
        await this.prisma.question.update({
          where: { id: q.id },
          data: {
            difficulty: newDifficulty as any,
            lastCalibratedAt: new Date(),
            // Reset counters after calibration to re-evaluate at new level
            totalAnswers: 0,
            correctAnswers: 0,
          },
        });

        changes.push({
          questionId: q.id,
          oldDifficulty: q.difficulty,
          newDifficulty,
          correctRate: Math.round(correctRate * 100) / 100,
          totalAnswers: q.totalAnswers,
        });

        this.logger.log(
          `BC9: Question ${q.id} recalibrated ${q.difficulty} → ${newDifficulty} (${Math.round(correctRate * 100)}% correct, ${q.totalAnswers} answers)`,
        );
      }
    }

    this.logger.log(
      `BC9: Recalibration complete — ${questions.length} analyzed, ${changes.length} adjusted`,
    );

    return {
      analyzed: questions.length,
      adjusted: changes.length,
      changes,
    };
  }

  /**
   * Get answer statistics overview for admin dashboard.
   */
  async getAnswerStatsOverview() {
    const [totalQuestions, withStats, difficultyBreakdown] = await Promise.all([
      this.prisma.question.count({ where: { isActive: true } }),
      this.prisma.question.count({
        where: { isActive: true, totalAnswers: { gt: 0 } },
      }),
      this.prisma.question.groupBy({
        by: ['difficulty'],
        where: { isActive: true },
        _count: { id: true },
        _avg: { totalAnswers: true, correctAnswers: true },
      }),
    ]);

    const breakdown = difficultyBreakdown.map(
      (d: {
        difficulty: string;
        _count: { id: number };
        _avg: { totalAnswers: number | null; correctAnswers: number | null };
      }) => ({
        difficulty: d.difficulty,
        count: d._count.id,
        avgTotalAnswers: Math.round(d._avg.totalAnswers ?? 0),
        avgCorrectRate:
          d._avg.totalAnswers && d._avg.correctAnswers
            ? Math.round((d._avg.correctAnswers / d._avg.totalAnswers) * 100)
            : 0,
      }),
    );

    return {
      totalQuestions,
      withAnswerData: withStats,
      readyForCalibration: await this.prisma.question.count({
        where: {
          isActive: true,
          totalAnswers: { gte: QuestionService.MIN_ANSWERS_FOR_CALIBRATION },
        },
      }),
      difficultyBreakdown: breakdown,
    };
  }

  /**
   * Returns categories that have at least `minCount` active questions.
   */
  async getAvailableCategories(minCount = 1): Promise<string[]> {
    const groups = await this.prisma.question.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
      having: { id: { _count: { gte: minCount } } },
    });

    return groups.map((g: { category: string }) => g.category);
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
