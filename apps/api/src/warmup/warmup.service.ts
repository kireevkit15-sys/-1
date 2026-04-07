import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StatsService } from '../stats/stats.service';
import { QuestionService } from '../question/question.service';

/** 5 вопросов, ещё не отвеченных */
export interface WarmupQuestions {
  type: 'questions';
  questions: Array<{
    id: string;
    text: string;
    options: string[];
    category: string;
    difficulty: string;
  }>;
  date: string; // YYYY-MM-DD
}

/** Результат после сабмита */
export interface WarmupResult {
  type: 'result';
  correct: number;
  total: number;
  xpEarned: number;
  streakDays: number;
  date: string;
}

export interface WarmupAnswer {
  questionId: string;
  selectedIndex: number;
}

const WARMUP_COUNT = 5;
const SEEN_TTL_DAYS = 30;
const CACHE_TTL_SECONDS = 86_400; // 24 h
const XP_CORRECT = 20;
const XP_PARTICIPATION = 5;

@Injectable()
export class WarmupService {
  private readonly logger = new Logger(WarmupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly stats: StatsService,
    private readonly questionService: QuestionService,
  ) {}

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  /** YYYY-MM-DD in UTC */
  private todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private redisKeyQuestions(userId: string, date: string): string {
    return `warmup:${userId}:${date}`;
  }

  private redisKeyResult(userId: string, date: string): string {
    return `warmup:result:${userId}:${date}`;
  }

  private redisKeySeen(userId: string): string {
    return `warmup:seen:${userId}`;
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Получить 5 случайных вопросов для сегодня.
   * - Если уже делал сегодня → вернуть результат.
   * - Если подборка уже сгенерирована, но не отвечена → вернуть из кеша.
   * - Иначе сгенерировать, закешировать и вернуть.
   */
  async getToday(userId: string): Promise<WarmupQuestions | WarmupResult> {
    const date = this.todayUTC();

    // 1. Проверяем, есть ли результат за сегодня
    const cached = await this.redis.get(this.redisKeyResult(userId, date));
    if (cached) {
      return JSON.parse(cached) as WarmupResult;
    }

    // 2. Проверяем, есть ли уже подборка вопросов за сегодня
    const cachedQuestions = await this.redis.get(
      this.redisKeyQuestions(userId, date),
    );
    if (cachedQuestions) {
      return JSON.parse(cachedQuestions) as WarmupQuestions;
    }

    // 3. Получаем ID вопросов, которые юзер видел за последние 30 дней
    const seenIds = await this.getSeenQuestionIds(userId);

    // 4. Получаем 5 случайных вопросов, исключая виденные
    const questions = await this.questionService.getRandomForBattle({
      excludeIds: seenIds,
      count: WARMUP_COUNT,
    });

    if (questions.length < WARMUP_COUNT) {
      this.logger.warn(
        `Not enough unseen questions for user ${userId}, got ${questions.length}/${WARMUP_COUNT}. Falling back to any questions.`,
      );
      const needed = WARMUP_COUNT - questions.length;
      const existingIds = questions.map((q: { id: string }) => q.id);
      const fallback = await this.questionService.getRandomForBattle({
        excludeIds: existingIds,
        count: needed,
      });
      questions.push(...fallback);
    }

    if (questions.length === 0) {
      throw new BadRequestException(
        'No questions available for warmup. Please try later.',
      );
    }

    const payload: WarmupQuestions = {
      type: 'questions',
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options as string[],
        category: q.category,
        difficulty: q.difficulty,
      })),
      date,
    };

    // Кешируем подборку на 24 часа
    await this.redis.set(
      this.redisKeyQuestions(userId, date),
      JSON.stringify(payload),
      CACHE_TTL_SECONDS,
    );

    return payload;
  }

  /**
   * Принять ответы, подсчитать результат, обновить стрик и начислить XP.
   */
  async submit(
    userId: string,
    answers: WarmupAnswer[],
  ): Promise<WarmupResult> {
    const date = this.todayUTC();

    // Не давать отвечать дважды
    if (await this.hasCompletedToday(userId)) {
      throw new ConflictException('Warmup already completed today');
    }

    // Загрузить подборку из кеша — чтобы проверить что юзер отвечает на свои вопросы
    const cachedQuestions = await this.redis.get(
      this.redisKeyQuestions(userId, date),
    );
    if (!cachedQuestions) {
      throw new BadRequestException(
        'No warmup session found for today. Call GET /warmup/today first.',
      );
    }

    const session = JSON.parse(cachedQuestions) as WarmupQuestions;
    const questionIds = session.questions.map((q) => q.id);

    // Убедиться, что ответы совпадают с выданными вопросами
    for (const a of answers) {
      if (!questionIds.includes(a.questionId)) {
        throw new BadRequestException(
          `Question ${a.questionId} was not part of today's warmup`,
        );
      }
    }

    // Загружаем вопросы из БД для проверки правильности
    const dbQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctIndex: true },
    });

    const correctMap = new Map(
      dbQuestions.map((q) => [q.id, q.correctIndex]),
    );

    // Подсчёт
    let correct = 0;
    for (const a of answers) {
      const correctIndex = correctMap.get(a.questionId);
      if (correctIndex !== undefined && a.selectedIndex === correctIndex) {
        correct++;
      }
    }

    const total = answers.length;
    const xpEarned =
      correct * XP_CORRECT + (total - correct) * XP_PARTICIPATION;

    // Обновить стрик
    const streakDays = await this.updateStreak(userId);

    // Начислить XP (eruditionXp — общая эрудиция)
    await this.stats.addXp(userId, 'eruditionXp', xpEarned);

    // Запомнить виденные вопросы
    await this.markQuestionsSeen(userId, questionIds);

    // Сохранить результат в Redis
    const result: WarmupResult = {
      type: 'result',
      correct,
      total,
      xpEarned,
      streakDays,
      date,
    };

    await this.redis.set(
      this.redisKeyResult(userId, date),
      JSON.stringify(result),
      CACHE_TTL_SECONDS,
    );

    return result;
  }

  /**
   * Проверить, делал ли юзер разминку сегодня.
   */
  async hasCompletedToday(userId: string): Promise<boolean> {
    const date = this.todayUTC();
    const cached = await this.redis.get(this.redisKeyResult(userId, date));
    return cached !== null;
  }

  // ──────────────────────────────────────────────
  // Streak logic
  // ──────────────────────────────────────────────

  /**
   * Обновить стрик.
   * - streakDate === yesterday → streakDays++
   * - streakDate < yesterday → streakDays = 1
   * - streakDate === today → оставить как есть (не должно случиться)
   */
  private async updateStreak(userId: string): Promise<number> {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { streakDays: true, streakDate: true },
    });

    if (!stats) {
      // Если нет записи — создадим через upsert ниже, но не должно быть
      return 1;
    }

    const today = new Date(this.todayUTC());
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    let newStreakDays: number;

    if (stats.streakDate) {
      const streakDateStr = stats.streakDate.toISOString().slice(0, 10);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);

      if (streakDateStr === todayStr) {
        // Уже обновлён сегодня (не должно случиться из-за hasCompletedToday)
        newStreakDays = stats.streakDays;
      } else if (streakDateStr === yesterdayStr) {
        // Продолжаем стрик
        newStreakDays = stats.streakDays + 1;
      } else {
        // Стрик сброшен — начинаем заново
        newStreakDays = 1;
      }
    } else {
      // Первая разминка
      newStreakDays = 1;
    }

    await this.prisma.userStats.update({
      where: { userId },
      data: {
        streakDays: newStreakDays,
        streakDate: today,
      },
    });

    return newStreakDays;
  }

  // ──────────────────────────────────────────────
  // Seen questions tracking (Redis set with TTL)
  // ──────────────────────────────────────────────

  /**
   * Получить ID вопросов, виденных за последние 30 дней.
   * Хранятся в Redis set: warmup:seen:{userId}
   */
  private async getSeenQuestionIds(userId: string): Promise<string[]> {
    const key = this.redisKeySeen(userId);
    const raw = await this.redis.get(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  /**
   * Добавить вопросы в список виденных.
   */
  private async markQuestionsSeen(
    userId: string,
    questionIds: string[],
  ): Promise<void> {
    const key = this.redisKeySeen(userId);
    const existing = await this.getSeenQuestionIds(userId);
    const merged = [...new Set([...existing, ...questionIds])];

    // TTL 30 дней
    const ttl = SEEN_TTL_DAYS * 24 * 60 * 60;
    await this.redis.set(key, JSON.stringify(merged), ttl);
  }
}
