import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from '../ai/ai.service';
import {
  buildConceptExplainPrompt,
  buildBarrierHintPrompt,
  buildMiniQuizPrompt,
} from '../ai/prompts/learning-tutor';
import type { ConceptExplainDto, BarrierHintDto, GenerateQuizDto } from './dto/learning-ai.dto';

// ── Rate limits ───────────────────────────────────────────────────────

/** Max AI requests per user per day for learning endpoints */
const DAILY_LEARNING_AI_LIMIT = 20;
/** Max tokens per user per day for learning AI */
const DAILY_LEARNING_TOKEN_BUDGET = 30_000;
/** TTL for daily counters (25 hours to cover timezone edge) */
const DAILY_TTL = 90_000;
/** Max hints per barrier */
const MAX_HINTS_PER_BARRIER = 5;

@Injectable()
export class LearningAiService {
  private readonly logger = new Logger(LearningAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ai: AiService,
  ) {}

  // ── L24.2: POST /learning/ai/explain ───────────────────────────────

  async explainConcept(userId: string, dto: ConceptExplainDto) {
    await this.checkLearningRateLimit(userId);

    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
      include: {
        relationsFrom: {
          include: { target: { select: { nameRu: true } } },
          take: 5,
        },
      },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    // Get user mastery for depth adaptation
    const mastery = await this.prisma.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId: dto.conceptId } },
    });

    // Get delivery style from learning path
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
      select: { deliveryStyle: true },
    });

    const relatedConcepts = concept.relationsFrom.map((r) => r.target.nameRu);

    const { systemPrompt, userPrompt } = buildConceptExplainPrompt({
      conceptName: concept.nameRu,
      conceptDescription: concept.description,
      branch: concept.branch,
      mastery: mastery?.mastery ?? 0,
      deliveryStyle: path?.deliveryStyle ?? undefined,
      userQuestion: dto.question,
      relatedConcepts,
    });

    const raw = await this.ai.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { userId, operation: 'learning_explain', maxTokens: 1024 },
    );

    await this.incrementLearningCounter(userId);

    let parsed: {
      explanation: string;
      keyInsight: string;
      practicalTip: string;
      followUpQuestion: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn('Failed to parse concept explanation JSON, using raw text');
      parsed = {
        explanation: raw,
        keyInsight: '',
        practicalTip: '',
        followUpQuestion: '',
      };
    }

    return {
      conceptId: concept.id,
      conceptName: concept.nameRu,
      branch: concept.branch,
      mastery: mastery?.mastery ?? 0,
      ...parsed,
    };
  }

  // ── L24.3: POST /learning/ai/hint ──────────────────────────────────

  async getBarrierHint(userId: string, dto: BarrierHintDto) {
    await this.checkLearningRateLimit(userId);

    const barrier = await this.prisma.levelBarrier.findUnique({
      where: { id: dto.barrierId },
      include: { path: true },
    });

    if (!barrier || barrier.path.userId !== userId) {
      throw new NotFoundException('Barrier not found');
    }

    if (barrier.passed !== null) {
      throw new ForbiddenException('Barrier already completed');
    }

    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    // Track hint count per barrier via Redis
    const hintKey = `learning:hint:${barrier.id}`;
    const hintCountStr = await this.redis.get(hintKey);
    const hintCount = hintCountStr ? parseInt(hintCountStr, 10) : 0;

    if (hintCount >= MAX_HINTS_PER_BARRIER) {
      throw new ForbiddenException(
        `Достигнут лимит подсказок (${MAX_HINTS_PER_BARRIER}) для этого испытания.`,
      );
    }

    // Determine which hint number for this concept in this barrier
    const conceptHintKey = `learning:hint:${barrier.id}:${dto.conceptId}`;
    const conceptHintStr = await this.redis.get(conceptHintKey);
    const hintNumber = conceptHintStr ? parseInt(conceptHintStr, 10) + 1 : 1;

    const { systemPrompt, userPrompt } = buildBarrierHintPrompt({
      stage: dto.stage,
      conceptName: concept.nameRu,
      conceptDescription: concept.description,
      userAttempt: dto.userAttempt,
      hintNumber: Math.min(hintNumber, 3),
    });

    const raw = await this.ai.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { userId, operation: 'learning_hint', maxTokens: 256 },
    );

    // Increment hint counters
    await this.redis.set(hintKey, String(hintCount + 1), DAILY_TTL);
    await this.redis.set(conceptHintKey, String(hintNumber), DAILY_TTL);
    await this.incrementLearningCounter(userId);

    let parsed: { hint: string; direction: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { hint: raw, direction: '' };
    }

    return {
      barrierId: barrier.id,
      conceptId: concept.id,
      conceptName: concept.nameRu,
      stage: dto.stage,
      hintNumber,
      hintsRemaining: MAX_HINTS_PER_BARRIER - hintCount - 1,
      ...parsed,
    };
  }

  // ── L24.4: POST /learning/ai/quiz ──────────────────────────────────

  async generateQuiz(userId: string, dto: GenerateQuizDto) {
    await this.checkLearningRateLimit(userId);

    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    const count = dto.count ?? 3;

    // Get existing questions for anti-duplication
    const existingQs = await this.prisma.conceptQuestion.findMany({
      where: { conceptId: dto.conceptId },
      include: { question: { select: { text: true } } },
      take: 20,
    });

    const existingTexts = existingQs.map((cq) => cq.question.text);

    const { systemPrompt, userPrompt } = buildMiniQuizPrompt({
      conceptName: concept.nameRu,
      conceptDescription: concept.description,
      branch: concept.branch,
      difficulty: concept.difficulty,
      count,
      existingQuestions: existingTexts,
    });

    const raw = await this.ai.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { userId, operation: 'learning_quiz', maxTokens: 2048 },
    );

    await this.incrementLearningCounter(userId);

    let questions: Array<{
      text: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;

    try {
      const parsed = JSON.parse(raw);
      questions = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.logger.warn('Failed to parse quiz JSON');
      questions = [];
    }

    // Validate each question
    const validated = questions.filter(
      (q) =>
        typeof q.text === 'string' &&
        q.text.length > 0 &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3 &&
        typeof q.explanation === 'string',
    );

    return {
      conceptId: concept.id,
      conceptName: concept.nameRu,
      branch: concept.branch,
      difficulty: concept.difficulty,
      questionsGenerated: validated.length,
      questions: validated,
    };
  }

  // ── L24.5: Rate limiting helpers ───────────────────────────────────

  private async checkLearningRateLimit(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    // Check request count
    const countKey = `learning:ai:count:${userId}:${today}`;
    const countStr = await this.redis.get(countKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= DAILY_LEARNING_AI_LIMIT) {
      throw new ForbiddenException(
        `Дневной лимит AI-запросов обучения исчерпан (${DAILY_LEARNING_AI_LIMIT}). Попробуй завтра.`,
      );
    }

    // Check token budget
    const quota = await this.ai.checkDailyQuota(userId);
    if (quota.used >= DAILY_LEARNING_TOKEN_BUDGET) {
      throw new ForbiddenException(
        `Дневной бюджет токенов обучения исчерпан (${quota.used}/${DAILY_LEARNING_TOKEN_BUDGET}). Попробуй завтра.`,
      );
    }
  }

  private async incrementLearningCounter(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const countKey = `learning:ai:count:${userId}:${today}`;
    const current = await this.redis.get(countKey);
    await this.redis.set(countKey, String((current ? parseInt(current, 10) : 0) + 1), DAILY_TTL);
  }
}
