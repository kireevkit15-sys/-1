import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from './ai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { getErrorMessage } from '../common/utils/error.util';
import type { Branch, Difficulty } from '@prisma/client';

/**
 * LC10: Autonomous LLM Engine — background AI content generation.
 *
 * Responsibilities:
 * 1. Gap analysis: find branches/categories with too few questions
 * 2. Question generation: fill gaps using AI + RAG context
 * 3. Concept linking: auto-link generated questions to concepts
 * 4. Budget tracking: respect daily token limits
 */

interface GapAnalysis {
  branch: Branch;
  category: string;
  difficulty: Difficulty;
  existing: number;
  target: number;
  gap: number;
}

interface GenerationResult {
  gapsAnalyzed: number;
  questionsGenerated: number;
  questionsLinked: number;
  tokensUsed: number;
  errors: string[];
}

const LOCK_KEY = 'llm-engine:running';
const LOCK_TTL = 600; // 10 minutes max
const MIN_QUESTIONS_PER_CELL = 10;
const BATCH_SIZE = 5;
const MAX_DAILY_TOKENS = 500_000;
const DAILY_TOKEN_KEY = 'llm-engine:tokens:daily';

@Injectable()
export class LlmEngineService {
  private readonly logger = new Logger(LlmEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ai: AiService,
    private readonly knowledge: KnowledgeService,
  ) {}

  /**
   * Main entry point — called by CronService.
   * Acquires a Redis lock to prevent concurrent runs.
   */
  async run(): Promise<GenerationResult> {
    // Acquire lock
    const acquired = await this.acquireLock();
    if (!acquired) {
      this.logger.warn('LLM Engine already running, skipping');
      return { gapsAnalyzed: 0, questionsGenerated: 0, questionsLinked: 0, tokensUsed: 0, errors: [] };
    }

    const result: GenerationResult = {
      gapsAnalyzed: 0,
      questionsGenerated: 0,
      questionsLinked: 0,
      tokensUsed: 0,
      errors: [],
    };

    try {
      // Check daily budget
      const tokensUsedToday = await this.getDailyTokens();
      if (tokensUsedToday >= MAX_DAILY_TOKENS) {
        this.logger.log(`LLM Engine: daily budget exhausted (${tokensUsedToday}/${MAX_DAILY_TOKENS})`);
        return result;
      }

      // Step 1: Gap analysis
      const gaps = await this.analyzeGaps();
      result.gapsAnalyzed = gaps.length;
      this.logger.log(`LLM Engine: found ${gaps.length} gaps`);

      if (gaps.length === 0) {
        this.logger.log('LLM Engine: no gaps found, all cells have sufficient questions');
        return result;
      }

      // Step 2: Fill gaps (prioritized by gap size)
      const sorted = gaps.sort((a, b) => b.gap - a.gap);
      const budgetRemaining = MAX_DAILY_TOKENS - tokensUsedToday;
      const estimatedTokensPerQ = 500;
      const maxQuestions = Math.floor(budgetRemaining / estimatedTokensPerQ);

      let totalGenerated = 0;

      for (const gap of sorted) {
        if (totalGenerated >= maxQuestions) break;

        const toGenerate = Math.min(gap.gap, BATCH_SIZE, maxQuestions - totalGenerated);

        try {
          const generated = await this.fillGap(gap, toGenerate);
          totalGenerated += generated.saved;
          result.questionsGenerated += generated.saved;
          result.questionsLinked += generated.linked;
        } catch (err: unknown) {
          const msg = `Gap ${gap.branch}/${gap.category}/${gap.difficulty}: ${getErrorMessage(err)}`;
          result.errors.push(msg);
          this.logger.error(`LLM Engine: ${msg}`);
        }
      }

      // Update daily token counter (approximate)
      const approxTokens = totalGenerated * estimatedTokensPerQ;
      result.tokensUsed = approxTokens;
      await this.addDailyTokens(approxTokens);

      this.logger.log(
        `LLM Engine complete: ${result.questionsGenerated} generated, ${result.questionsLinked} linked, ~${result.tokensUsed} tokens`,
      );
    } finally {
      await this.releaseLock();
    }

    return result;
  }

  /**
   * Step 1: Analyze gaps — find branch/category/difficulty cells with fewer
   * than MIN_QUESTIONS_PER_CELL active questions.
   */
  private async analyzeGaps(): Promise<GapAnalysis[]> {
    const counts = await this.prisma.$queryRaw<
      Array<{ branch: Branch; category: string; difficulty: Difficulty; count: bigint }>
    >`
      SELECT branch, category, difficulty, COUNT(*) as count
      FROM questions
      WHERE "isActive" = true
      GROUP BY branch, category, difficulty
    `;

    // Get all known categories per branch
    const allCategories = await this.prisma.$queryRaw<
      Array<{ branch: Branch; category: string }>
    >`
      SELECT DISTINCT branch, category FROM questions WHERE "isActive" = true
    `;

    const difficulties: Difficulty[] = ['BRONZE', 'SILVER', 'GOLD'];
    const gaps: GapAnalysis[] = [];

    // Build a map of existing counts
    const countMap = new Map<string, number>();
    for (const row of counts) {
      countMap.set(`${row.branch}:${row.category}:${row.difficulty}`, Number(row.count));
    }

    // Check each cell
    for (const { branch, category } of allCategories) {
      for (const difficulty of difficulties) {
        const key = `${branch}:${category}:${difficulty}`;
        const existing = countMap.get(key) ?? 0;

        if (existing < MIN_QUESTIONS_PER_CELL) {
          gaps.push({
            branch,
            category,
            difficulty,
            existing,
            target: MIN_QUESTIONS_PER_CELL,
            gap: MIN_QUESTIONS_PER_CELL - existing,
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Step 2: Fill a single gap by generating questions via AI.
   */
  private async fillGap(
    gap: GapAnalysis,
    count: number,
  ): Promise<{ saved: number; linked: number }> {
    // Get RAG context
    let context = '';
    try {
      context = await this.knowledge.getContextForQuestion(gap.category, gap.branch, 3);
    } catch {
      // Knowledge service may be unavailable
    }

    // Get existing texts for deduplication
    const existing = await this.prisma.question.findMany({
      where: {
        branch: gap.branch,
        category: gap.category,
        difficulty: gap.difficulty,
        isActive: true,
      },
      select: { text: true },
      take: 20,
    });

    const generated = await this.ai.generateQuestions({
      categoryRu: gap.category,
      subcategoryRu: gap.category,
      topicRu: gap.category,
      branch: gap.branch,
      difficulty: gap.difficulty,
      count,
      existingQuestions: existing.map((q) => q.text),
      bloggerContext: context || undefined,
    });

    let saved = 0;
    let linked = 0;

    const statPrimary = gap.branch === 'STRATEGY' ? 'strategyXp'
      : gap.branch === 'LOGIC' ? 'logicXp'
      : gap.branch === 'ERUDITION' ? 'eruditionXp'
      : gap.branch === 'RHETORIC' ? 'rhetoricXp'
      : 'intuitionXp';

    for (const q of generated) {
      try {
        const created = await this.prisma.question.create({
          data: {
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            category: gap.category,
            branch: gap.branch,
            difficulty: gap.difficulty,
            statPrimary,
          },
        });
        saved++;

        // Auto-link to matching concepts
        const linkedCount = await this.linkQuestionToConcepts(created.id, gap.branch, gap.category);
        linked += linkedCount;
      } catch (err: unknown) {
        this.logger.warn(`LLM Engine: failed to save question: ${getErrorMessage(err)}`);
      }
    }

    this.logger.log(
      `LLM Engine: gap ${gap.branch}/${gap.category}/${gap.difficulty}: generated ${generated.length}, saved ${saved}, linked ${linked}`,
    );

    return { saved, linked };
  }

  /**
   * Auto-link a question to relevant concepts based on branch and category.
   */
  private async linkQuestionToConcepts(
    questionId: string,
    branch: Branch,
    category: string,
  ): Promise<number> {
    // Find concepts matching the branch and category
    const concepts = await this.prisma.concept.findMany({
      where: {
        branch,
        OR: [
          { category },
          { subcategory: category },
        ],
      },
      select: { id: true },
      take: 3,
    });

    if (concepts.length === 0) return 0;

    let linked = 0;
    for (const concept of concepts) {
      try {
        await this.prisma.conceptQuestion.create({
          data: { conceptId: concept.id, questionId },
        });
        linked++;
      } catch {
        // Duplicate link — ignore
      }
    }

    return linked;
  }

  // ── Redis lock helpers ────────────────────────────────────────────

  private async acquireLock(): Promise<boolean> {
    const client = this.redis.getClient();
    const result = await client.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX');
    return result === 'OK';
  }

  private async releaseLock(): Promise<void> {
    await this.redis.del(LOCK_KEY);
  }

  private async getDailyTokens(): Promise<number> {
    const val = await this.redis.get(DAILY_TOKEN_KEY);
    return val ? parseInt(val, 10) : 0;
  }

  private async addDailyTokens(tokens: number): Promise<void> {
    const client = this.redis.getClient();
    await client.incrby(DAILY_TOKEN_KEY, tokens);
    // Auto-expire at end of day (set TTL to 24h if not set)
    await client.expire(DAILY_TOKEN_KEY, 86400);
  }
}
