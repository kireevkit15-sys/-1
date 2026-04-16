import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import type { Question, Prisma, Difficulty, Branch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from '../ai/ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { StatsService } from '../stats/stats.service';
import type {
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiService: AiService,
    private readonly knowledgeService: KnowledgeService,
    private readonly statsService: StatsService,
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

    const where: Prisma.QuestionWhereInput = {};
    if (filters.category) where.category = filters.category;
    if (filters.difficulty) where.difficulty = filters.difficulty as Difficulty;
    if (filters.branch) where.branch = filters.branch as Branch;
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

  /**
   * L23.1: Minimum concept mastery required to unlock concept-linked questions.
   */
  private static readonly CONCEPT_MASTERY_THRESHOLD = 0.3;

  async getRandomForBattle(params: {
    branch?: string;
    difficulty?: string;
    category?: string;
    excludeIds?: string[];
    count?: number;
    throwOnEmpty?: boolean;
    userId?: string;
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

    // L23.1: Only show concept-linked questions if user has mastered the concept.
    // Questions without concept links are always available.
    if (params.userId) {
      conditions.push(
        `(NOT EXISTS (SELECT 1 FROM concept_questions cq WHERE cq."questionId" = questions.id)
          OR EXISTS (
            SELECT 1 FROM concept_questions cq
            JOIN user_concept_mastery ucm ON ucm."conceptId" = cq."conceptId"
            WHERE cq."questionId" = questions.id
              AND ucm."userId" = $${paramIndex}
              AND ucm."mastery" >= ${QuestionService.CONCEPT_MASTERY_THRESHOLD}
          ))`,
      );
      values.push(params.userId);
      paramIndex++;
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
   * B17.3 — Determine difficulty based on player's branch rating.
   * Rating < 900 → BRONZE, 900–1100 → SILVER, > 1100 → GOLD.
   */
  async getAdaptiveDifficulty(
    userId: string,
    branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION',
  ): Promise<'BRONZE' | 'SILVER' | 'GOLD'> {
    const rating = await this.statsService.getBranchRating(userId, branch as any);
    if (rating < 900) return 'BRONZE';
    if (rating <= 1100) return 'SILVER';
    return 'GOLD';
  }

  /**
   * BC7 + B17.3 — Adaptive question selection with AI fallback.
   *
   * 1. If no difficulty specified and userId provided, auto-select by branch rating
   * 2. Try to get questions from DB matching criteria
   * 3. If not enough — search KnowledgeService for context
   * 4. Generate missing questions via AiService using RAG context
   * 5. Save generated questions to DB for future use
   */
  async getForBattle(params: {
    branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
    difficulty?: 'BRONZE' | 'SILVER' | 'GOLD';
    category?: string;
    excludeIds?: string[];
    count?: number;
    userId?: string;
  }) {
    const count = params.count || 5;

    // B17.3: Auto-select difficulty if not specified and userId provided
    let difficulty = params.difficulty;
    if (!difficulty && params.userId) {
      difficulty = await this.getAdaptiveDifficulty(params.userId, params.branch);
      this.logger.log(`B17.3: Adaptive difficulty for user ${params.userId}: ${difficulty} (branch=${params.branch ?? 'overall'})`);
    }

    // Step 1: Try DB first (don't throw on empty — AI fallback below)
    const dbQuestions = await this.getRandomForBattle({
      ...params,
      difficulty,
      count,
      throwOnEmpty: false,
      userId: params.userId,
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
    const finalDifficulty = difficulty ?? params.difficulty ?? 'BRONZE';
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
        difficulty: finalDifficulty,
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
              difficulty: finalDifficulty,
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

  // ── B19.5: Content moderation queue ──────────────────────────

  /**
   * Get moderation queue: reported questions with full report details.
   */
  async getModerationQueue(options: { limit?: number; offset?: number } = {}) {
    const { limit = 20, offset = 0 } = options;

    // Get questions with pending reports (still active)
    const reported = await this.prisma.questionFeedback.groupBy({
      by: ['questionId'],
      where: { type: 'REPORT' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip: offset,
      take: limit,
    });

    const questionIds = reported.map((r: { questionId: string }) => r.questionId);

    // Fetch questions and their reports with user info
    const [questions, reports] = await Promise.all([
      this.prisma.question.findMany({
        where: { id: { in: questionIds } },
      }),
      this.prisma.questionFeedback.findMany({
        where: { questionId: { in: questionIds }, type: 'REPORT' },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const questionsMap = new Map(questions.map(q => [q.id, q]));
    const reportsMap = new Map<string, typeof reports>();
    for (const r of reports) {
      const arr = reportsMap.get(r.questionId) ?? [];
      arr.push(r);
      reportsMap.set(r.questionId, arr);
    }

    const totalCount = await this.prisma.questionFeedback.groupBy({
      by: ['questionId'],
      where: { type: 'REPORT' },
    });

    return {
      items: reported.map((r: { questionId: string; _count: { id: number } }) => ({
        question: questionsMap.get(r.questionId),
        reportCount: r._count.id,
        reports: reportsMap.get(r.questionId) ?? [],
      })),
      total: totalCount.length,
      limit,
      offset,
    };
  }

  /**
   * Dismiss all reports for a question (admin reviewed, question is fine).
   */
  async dismissReports(questionId: string) {
    const deleted = await this.prisma.questionFeedback.deleteMany({
      where: { questionId, type: 'REPORT' },
    });

    this.logger.log(`Dismissed ${deleted.count} reports for question ${questionId}`);
    return { questionId, dismissedCount: deleted.count };
  }

  /**
   * Deactivate question and dismiss reports (admin agrees with reports).
   */
  async moderateDeactivate(questionId: string) {
    await this.prisma.$transaction([
      this.prisma.question.update({
        where: { id: questionId },
        data: { isActive: false },
      }),
      this.prisma.questionFeedback.deleteMany({
        where: { questionId, type: 'REPORT' },
      }),
    ]);

    this.logger.log(`Question ${questionId} deactivated via moderation`);
    return { questionId, status: 'deactivated' };
  }

  // ── B19.6: A/B testing ───────────────────────────────────────

  /**
   * Create a variant (B) of an existing question with different text/options.
   */
  async createVariant(
    originalId: string,
    data: { text: string; options: string[]; explanation?: string },
  ) {
    const original = await this.prisma.question.findUnique({
      where: { id: originalId },
    });

    if (!original) {
      throw new NotFoundException(`Question ${originalId} not found`);
    }

    // Mark original as variant "A" if not already
    if (!original.variantLabel) {
      await this.prisma.question.update({
        where: { id: originalId },
        data: { variantLabel: 'A' },
      });
    }

    // Count existing variants to determine label
    const existingVariants = await this.prisma.question.count({
      where: { variantOf: originalId },
    });
    const label = String.fromCharCode(66 + existingVariants); // B, C, D...

    return this.prisma.question.create({
      data: {
        category: original.category,
        branch: original.branch,
        difficulty: original.difficulty,
        text: data.text,
        options: data.options,
        correctIndex: original.correctIndex,
        explanation: data.explanation ?? original.explanation,
        statPrimary: original.statPrimary,
        statSecondary: original.statSecondary,
        tags: original.tags,
        variantOf: originalId,
        variantLabel: label,
      },
    });
  }

  /**
   * Compare A/B variants by % correct answers.
   */
  async getAbTestResults(originalId: string) {
    // Get original + all variants
    const questions = await this.prisma.question.findMany({
      where: {
        OR: [
          { id: originalId },
          { variantOf: originalId },
        ],
      },
      select: {
        id: true,
        text: true,
        variantLabel: true,
        totalAnswers: true,
        correctAnswers: true,
        avgTimeTakenMs: true,
        isActive: true,
      },
      orderBy: { variantLabel: 'asc' },
    });

    if (questions.length === 0) {
      throw new NotFoundException(`Question ${originalId} not found`);
    }

    return {
      originalId,
      variants: questions.map(q => ({
        id: q.id,
        label: q.variantLabel ?? 'A',
        text: q.text,
        totalAnswers: q.totalAnswers,
        correctAnswers: q.correctAnswers,
        correctRate: q.totalAnswers > 0
          ? Math.round((q.correctAnswers / q.totalAnswers) * 10000) / 100
          : null,
        avgTimeTakenMs: q.avgTimeTakenMs,
        isActive: q.isActive,
      })),
      recommendation: this.getAbRecommendation(questions),
    };
  }

  private getAbRecommendation(
    variants: Array<{ totalAnswers: number; correctAnswers: number; variantLabel: string | null }>,
  ): string | null {
    const withEnoughData = variants.filter(v => v.totalAnswers >= 30);
    if (withEnoughData.length < 2) return 'Недостаточно данных (минимум 30 ответов на вариант)';

    const rates = withEnoughData.map(v => ({
      label: v.variantLabel ?? 'A',
      rate: v.correctAnswers / v.totalAnswers,
    }));

    // Find the variant closest to 50-60% correct (ideal difficulty)
    const ideal = 0.55;
    rates.sort((a, b) => Math.abs(a.rate - ideal) - Math.abs(b.rate - ideal));
    return `Рекомендация: вариант "${rates[0]!.label}" ближе к идеальной сложности (${Math.round(rates[0]!.rate * 100)}%)`;
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
    return this.redis.getOrSet(`questions:categories:min${minCount}`, 600, async () => {
      const groups = await this.prisma.question.groupBy({
        by: ['category'],
        where: { isActive: true },
        _count: { id: true },
        having: { id: { _count: { gte: minCount } } },
      });

      return groups.map((g: { category: string }) => g.category);
    });
  }

  // ── B14.1: AI Question Generation ────────────────────────────────

  private static readonly BRANCH_STAT_MAP: Record<string, string> = {
    STRATEGY: 'strategyXp',
    LOGIC: 'logicXp',
    ERUDITION: 'eruditionXp',
    RHETORIC: 'rhetoricXp',
    INTUITION: 'intuitionXp',
  };

  async generateQuestions(params: {
    category: string;
    branch: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
    difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
    count: number;
    subcategory?: string;
    topic?: string;
    saveToDB?: boolean;
  }) {
    const count = Math.min(params.count, 20);
    const saveToDB = params.saveToDB !== false;

    // Get existing questions for anti-duplication
    const existing = await this.prisma.question.findMany({
      where: {
        branch: params.branch,
        category: params.category,
        isActive: true,
      },
      select: { text: true },
      take: 50,
    });
    const existingTexts = existing.map((q) => q.text);

    // Get RAG context
    let bloggerContext = '';
    try {
      bloggerContext = await this.knowledgeService.getContextForQuestion(
        params.category,
        params.branch,
        3,
      );
    } catch {
      this.logger.warn('generateQuestions: KnowledgeService unavailable');
    }

    // Generate via AI
    const generated = await this.aiService.generateQuestions({
      categoryRu: params.category,
      subcategoryRu: params.subcategory || params.category,
      topicRu: params.topic || params.category,
      branch: params.branch,
      difficulty: params.difficulty,
      count,
      existingQuestions: existingTexts,
      bloggerContext: bloggerContext || undefined,
    });

    if (!saveToDB) {
      return {
        generated: generated.length,
        saved: 0,
        questions: generated,
      };
    }

    // Save to DB
    const saved = [];
    for (const q of generated) {
      try {
        const created = await this.prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            category: params.category,
            branch: params.branch,
            difficulty: params.difficulty,
            statPrimary: QuestionService.BRANCH_STAT_MAP[params.branch] || 'strategyXp',
          },
        });
        saved.push(created);
      } catch (err) {
        this.logger.warn(`generateQuestions: failed to save: ${(err as Error).message}`);
      }
    }

    this.logger.log(`B14.1: Generated ${generated.length}, saved ${saved.length} (${params.branch}/${params.category}/${params.difficulty})`);

    return {
      generated: generated.length,
      saved: saved.length,
      questions: saved,
    };
  }

  // ── B14.2: Coverage Gaps Analysis ───────────────────────────────

  async getCoverageGaps() {
    const allBranches = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];
    const allDifficulties = ['BRONZE', 'SILVER', 'GOLD'];

    // Get counts per branch × difficulty
    const counts = await this.prisma.question.groupBy({
      by: ['branch', 'difficulty'],
      where: { isActive: true },
      _count: { id: true },
    });

    // Get counts per branch × category
    const categoryCounts = await this.prisma.question.groupBy({
      by: ['branch', 'category'],
      where: { isActive: true },
      _count: { id: true },
    });

    // Build matrix
    const matrix: Array<{
      branch: string;
      difficulty: string;
      count: number;
      status: 'critical' | 'low' | 'ok' | 'good';
    }> = [];

    for (const branch of allBranches) {
      for (const difficulty of allDifficulties) {
        const found = counts.find(
          (c: { branch: string; difficulty: string }) => c.branch === branch && c.difficulty === difficulty,
        );
        const count = found ? found._count.id : 0;
        const status = count === 0 ? 'critical' : count < 5 ? 'low' : count < 15 ? 'ok' : 'good';
        matrix.push({ branch, difficulty, count, status });
      }
    }

    // Gaps: branch × difficulty combos with < 5 questions
    const gaps = matrix.filter((m) => m.count < 5);

    // Categories per branch
    const categoryMap: Record<string, Array<{ category: string; count: number }>> = {};
    for (const branch of allBranches) {
      categoryMap[branch] = categoryCounts
        .filter((c: { branch: string }) => c.branch === branch)
        .map((c: { category: string; _count: { id: number } }) => ({
          category: c.category,
          count: c._count.id,
        }))
        .sort((a: { count: number }, b: { count: number }) => b.count - a.count);
    }

    const total = await this.prisma.question.count({ where: { isActive: true } });

    return {
      total,
      matrix,
      gaps,
      gapCount: gaps.length,
      categoriesByBranch: categoryMap,
    };
  }

  // ── B14.3: Bulk Validation ──────────────────────────────────────

  async bulkValidate(questions: CreateQuestionDto[]) {
    const results: Array<{
      index: number;
      valid: boolean;
      errors: string[];
      duplicate: boolean;
    }> = [];

    // Load existing texts for duplicate detection
    const existingTexts = await this.prisma.question.findMany({
      where: { isActive: true },
      select: { text: true },
    });
    const existingSet = new Set(existingTexts.map((q) => q.text.toLowerCase().trim()));

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const errors: string[] = [];

      // Validate structure
      if (!q.text || q.text.trim().length < 10) {
        errors.push('Текст вопроса слишком короткий (минимум 10 символов)');
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push('Минимум 2 варианта ответа');
      }
      if (q.options && q.options.length !== 4) {
        errors.push('Рекомендуется 4 варианта ответа');
      }
      if (q.correctIndex == null || q.correctIndex < 0 || (q.options && q.correctIndex >= q.options.length)) {
        errors.push('correctIndex вне диапазона');
      }
      if (!q.category || q.category.trim().length === 0) {
        errors.push('Категория обязательна');
      }
      if (!q.branch) {
        errors.push('Ветка (branch) обязательна');
      }
      if (!q.difficulty) {
        errors.push('Сложность (difficulty) обязательна');
      }
      if (!q.statPrimary) {
        errors.push('statPrimary обязателен');
      }

      // Check for duplicate options
      if (q.options) {
        const uniqueOpts = new Set(q.options.map((o) => o.toLowerCase().trim()));
        if (uniqueOpts.size !== q.options.length) {
          errors.push('Есть дублирующиеся варианты ответа');
        }
      }

      // Check for duplicate in DB
      const duplicate = q.text ? existingSet.has(q.text.toLowerCase().trim()) : false;
      if (duplicate) {
        errors.push('Дубликат: такой вопрос уже есть в БД');
      }

      results.push({
        index: i,
        valid: errors.length === 0,
        errors,
        duplicate,
      });
    }

    const validCount = results.filter((r) => r.valid).length;

    return {
      total: questions.length,
      valid: validCount,
      invalid: questions.length - validCount,
      duplicates: results.filter((r) => r.duplicate).length,
      results,
    };
  }

  // ── B14.4: Export Questions ─────────────────────────────────────

  async exportQuestions(filters?: {
    branch?: string;
    difficulty?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.branch) where.branch = filters.branch;
    if (filters?.difficulty) where.difficulty = filters.difficulty;
    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    else where.isActive = true;

    const questions = await this.prisma.question.findMany({
      where,
      orderBy: [{ branch: 'asc' }, { category: 'asc' }, { difficulty: 'asc' }],
    });

    return {
      exportedAt: new Date().toISOString(),
      count: questions.length,
      filters: filters || {},
      questions: questions.map((q) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        category: q.category,
        branch: q.branch,
        difficulty: q.difficulty,
        statPrimary: q.statPrimary,
        statSecondary: q.statSecondary,
        explanation: q.explanation,
        totalAnswers: q.totalAnswers,
        correctAnswers: q.correctAnswers,
        avgTimeTakenMs: q.avgTimeTakenMs,
        createdAt: q.createdAt,
      })),
    };
  }

  // ── B14.5: Auto-rotation of bad questions ──────────────────────

  private static readonly MIN_ANSWERS_FOR_ROTATION = 100;
  private static readonly SKIP_RATE_THRESHOLD = 0.5;   // >50% dislike → rotate
  private static readonly LOW_CORRECT_THRESHOLD = 0.2;  // <20% correct → rotate

  async autoRotateQuestions() {
    // Find questions with enough answers and poor performance
    const candidates = await this.prisma.question.findMany({
      where: {
        isActive: true,
        totalAnswers: { gte: QuestionService.MIN_ANSWERS_FOR_ROTATION },
      },
      select: {
        id: true,
        text: true,
        branch: true,
        category: true,
        difficulty: true,
        totalAnswers: true,
        correctAnswers: true,
        _count: {
          select: {
            feedbacks: true,
          },
        },
      },
    });

    const rotated: Array<{
      questionId: string;
      reason: string;
      correctRate: number;
      totalAnswers: number;
    }> = [];

    for (const q of candidates) {
      const correctRate = q.correctAnswers / q.totalAnswers;

      // Check feedback: count dislikes
      const dislikeCount = await this.prisma.questionFeedback.count({
        where: { questionId: q.id, type: 'DISLIKE' },
      });
      const totalFeedback = q._count.feedbacks;
      const dislikeRate = totalFeedback > 0 ? dislikeCount / totalFeedback : 0;

      let reason = '';
      if (correctRate < QuestionService.LOW_CORRECT_THRESHOLD) {
        reason = `Низкий % правильных: ${Math.round(correctRate * 100)}% (порог: ${QuestionService.LOW_CORRECT_THRESHOLD * 100}%)`;
      } else if (dislikeRate > QuestionService.SKIP_RATE_THRESHOLD && totalFeedback >= 10) {
        reason = `Высокий % дизлайков: ${Math.round(dislikeRate * 100)}% (${dislikeCount}/${totalFeedback})`;
      }

      if (reason) {
        await this.prisma.question.update({
          where: { id: q.id },
          data: { isActive: false },
        });
        rotated.push({
          questionId: q.id,
          reason,
          correctRate: Math.round(correctRate * 100) / 100,
          totalAnswers: q.totalAnswers,
        });
        this.logger.log(`B14.5: Deactivated question ${q.id}: ${reason}`);
      }
    }

    return {
      analyzed: candidates.length,
      deactivated: rotated.length,
      rotated,
    };
  }

  // ── B14.6: Tags System ───────────────────────────────────────

  async setTags(questionId: string, tags: string[]) {
    await this.findOne(questionId);
    const normalized = tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
    const unique = [...new Set(normalized)];

    return this.prisma.question.update({
      where: { id: questionId },
      data: { tags: unique },
    });
  }

  async findByTags(tags: string[], matchAll = false) {
    const normalized = tags.map((t) => t.toLowerCase().trim());

    if (matchAll) {
      return this.prisma.question.findMany({
        where: {
          isActive: true,
          tags: { hasEvery: normalized },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    return this.prisma.question.findMany({
      where: {
        isActive: true,
        tags: { hasSome: normalized },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAllTags() {
    const questions = await this.prisma.question.findMany({
      where: { isActive: true, tags: { isEmpty: false } },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const q of questions) {
      for (const tag of q.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
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
