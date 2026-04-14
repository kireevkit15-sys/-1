import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type {
  QuestionGeneratorParams} from './prompts/question-generator';
import {
  buildQuestionGeneratorPrompt
} from './prompts/question-generator';
import type {
  SocraticTutorParams} from './prompts/socratic-tutor';
import {
  buildSocraticTutorPrompt
} from './prompts/socratic-tutor';

// ── Types for AI service methods ──────────────────────────────────────

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SocraticMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SocraticChatParams extends SocraticTutorParams {
  messages: SocraticMessage[];
  userId?: string;
}

export interface ContentConcept {
  concept: string;
  claim: string;
  example: string;
  trust_level: 'needs_validation' | 'validated' | 'opinion';
  tags: string[];
  branch: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatChoice {
  message: { content: string };
}

interface ChatResponse {
  choices: ChatChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelFast: string;
  private readonly modelSmart: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('AI_API_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'AI_BASE_URL',
      'https://api.polza.ai/v1',
    );
    this.modelFast = this.configService.get<string>(
      'AI_MODEL_FAST',
      'google/gemini-2.5-flash',
    );
    this.modelSmart = this.configService.get<string>(
      'AI_MODEL_SMART',
      'google/gemini-2.5-flash',
    );

    if (!this.apiKey) {
      this.logger.warn('AI_API_KEY not set — AI features disabled');
    } else {
      this.logger.log(
        `AI configured: base=${this.baseUrl} fast=${this.modelFast} smart=${this.modelSmart}`,
      );
    }
  }

  // ── Core API call ──────────────────────────────────────────────────

  private async chat(
    messages: ChatMessage[],
    options: { model?: string; maxTokens?: number; userId?: string; operation?: string } = {},
  ): Promise<string> {
    const model = options.model ?? this.modelFast;
    const maxTokens = options.maxTokens ?? 1024;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as ChatResponse;

    if (data.usage) {
      this.logger.log(
        `AI usage: model=${model} in=${data.usage.prompt_tokens} out=${data.usage.completion_tokens}`,
      );

      // B17.4: Track token usage in DB
      this.trackTokenUsage({
        userId: options.userId,
        model,
        operation: options.operation ?? 'unknown',
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      }).catch((err) => {
        this.logger.warn(`Failed to track token usage: ${(err as Error).message}`);
      });
    }

    return data.choices?.[0]?.message?.content ?? '';
  }

  /**
   * Public chat method for arbitrary AI calls (learning grading, barrier challenges, etc.)
   */
  async chatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: { userId?: string; operation?: string; maxTokens?: number } = {},
  ): Promise<string> {
    return this.chat(messages, {
      userId: options.userId,
      operation: options.operation ?? 'chat_completion',
      maxTokens: options.maxTokens ?? 1024,
    });
  }

  /**
   * B17.4 — Record token usage to DB.
   */
  private async trackTokenUsage(params: {
    userId?: string;
    model: string;
    operation: string;
    promptTokens: number;
    completionTokens: number;
  }) {
    const date = new Date().toISOString().slice(0, 10);
    await this.prisma.aiTokenUsage.create({
      data: {
        userId: params.userId || null,
        date,
        model: params.model,
        operation: params.operation,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.promptTokens + params.completionTokens,
      },
    });
  }

  /**
   * B17.4 — Get token usage summary for admin dashboard.
   */
  async getTokenUsageSummary(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = since.toISOString().slice(0, 10);

    const [byDay, byOperation, byUser, totals] = await Promise.all([
      this.prisma.$queryRaw<{ date: string; total_tokens: bigint; requests: bigint }[]>`
        SELECT date,
               SUM("totalTokens")::bigint AS total_tokens,
               COUNT(id)::bigint AS requests
        FROM ai_token_usage
        WHERE date >= ${sinceDate}
        GROUP BY date
        ORDER BY date DESC
      `,
      this.prisma.$queryRaw<{ operation: string; total_tokens: bigint; requests: bigint }[]>`
        SELECT operation,
               SUM("totalTokens")::bigint AS total_tokens,
               COUNT(id)::bigint AS requests
        FROM ai_token_usage
        WHERE date >= ${sinceDate}
        GROUP BY operation
        ORDER BY total_tokens DESC
      `,
      this.prisma.$queryRaw<{ user_id: string; name: string; total_tokens: bigint; requests: bigint }[]>`
        SELECT t."userId" AS user_id, u.name,
               SUM(t."totalTokens")::bigint AS total_tokens,
               COUNT(t.id)::bigint AS requests
        FROM ai_token_usage t
        LEFT JOIN users u ON u.id = t."userId"
        WHERE t.date >= ${sinceDate} AND t."userId" IS NOT NULL
        GROUP BY t."userId", u.name
        ORDER BY total_tokens DESC
        LIMIT 20
      `,
      this.prisma.$queryRaw<{ total_tokens: bigint; total_prompt: bigint; total_completion: bigint; requests: bigint }[]>`
        SELECT SUM("totalTokens")::bigint AS total_tokens,
               SUM("promptTokens")::bigint AS total_prompt,
               SUM("completionTokens")::bigint AS total_completion,
               COUNT(id)::bigint AS requests
        FROM ai_token_usage
        WHERE date >= ${sinceDate}
      `,
    ]);

    const t = totals[0];

    return {
      period: { days, since: sinceDate },
      totals: {
        tokens: Number(t?.total_tokens ?? 0),
        promptTokens: Number(t?.total_prompt ?? 0),
        completionTokens: Number(t?.total_completion ?? 0),
        requests: Number(t?.requests ?? 0),
      },
      byDay: byDay.map((d) => ({
        date: d.date,
        tokens: Number(d.total_tokens),
        requests: Number(d.requests),
      })),
      byOperation: byOperation.map((o) => ({
        operation: o.operation,
        tokens: Number(o.total_tokens),
        requests: Number(o.requests),
      })),
      topUsers: byUser.map((u) => ({
        userId: u.user_id,
        name: u.name,
        tokens: Number(u.total_tokens),
        requests: Number(u.requests),
      })),
    };
  }

  /**
   * B17.5 — Check if user has exceeded daily AI quota.
   * Returns remaining quota info.
   */
  async checkDailyQuota(userId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    exceeded: boolean;
  }> {
    const DAILY_TOKEN_LIMIT = 50000; // 50k tokens per day per user
    const today = new Date().toISOString().slice(0, 10);

    const result = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COALESCE(SUM("totalTokens"), 0)::bigint AS total
      FROM ai_token_usage
      WHERE "userId" = ${userId}::uuid AND date = ${today}
    `;

    const used = Number(result[0]?.total ?? 0);

    return {
      used,
      limit: DAILY_TOKEN_LIMIT,
      remaining: Math.max(0, DAILY_TOKEN_LIMIT - used),
      exceeded: used >= DAILY_TOKEN_LIMIT,
    };
  }

  // ── Public methods ─────────────────────────────────────────────────

  async generateExplanation(
    question: string,
    correctAnswer: string,
    userAnswer: string,
    userId?: string,
  ): Promise<string> {
    try {
      return await this.chat([
        {
          role: 'user',
          content: `Вопрос: "${question}"\nПравильный ответ: "${correctAnswer}"\nОтвет пользователя: "${userAnswer}"\n\nОбъясни кратко и понятно, почему правильный ответ именно такой. Если пользователь ответил неправильно, объясни его ошибку. Отвечай на русском языке.`,
        },
      ], { maxTokens: 512, userId, operation: 'explanation' });
    } catch (error) {
      this.logger.error('Failed to generate AI explanation', error);
      return 'Не удалось сгенерировать объяснение.';
    }
  }

  async generateHint(question: string, options: string[], userId?: string): Promise<string> {
    try {
      return await this.chat([
        {
          role: 'user',
          content: `Вопрос: "${question}"\nВарианты: ${options.join(', ')}\n\nДай небольшую подсказку, не раскрывая правильный ответ напрямую. Отвечай на русском языке.`,
        },
      ], { maxTokens: 256, userId, operation: 'hint' });
    } catch (error) {
      this.logger.error('Failed to generate AI hint', error);
      return 'Не удалось сгенерировать подсказку.';
    }
  }

  // ── generateQuestions — batch question generation ──────────────────

  async generateQuestions(
    params: QuestionGeneratorParams,
  ): Promise<GeneratedQuestion[]> {
    const { categoryRu, subcategoryRu, topicRu, difficulty, count } = params;
    this.logger.log(
      `generateQuestions: category="${categoryRu}" sub="${subcategoryRu}" topic="${topicRu}" difficulty=${difficulty} count=${count}`,
    );

    try {
      const prompt = buildQuestionGeneratorPrompt(params);

      const raw = await this.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 4096, operation: 'question_generation' },
      );

      const parsed = this.parseJsonArray<GeneratedQuestion>(raw);
      const validated = parsed.filter((q) => this.isValidQuestion(q));

      this.logger.log(
        `generateQuestions: parsed=${parsed.length} valid=${validated.length}/${count}`,
      );

      return validated;
    } catch (error) {
      this.logger.error(
        `generateQuestions failed: category="${categoryRu}" topic="${topicRu}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  // ── socraticChat — Socratic dialogue ──────────────────────────────

  async socraticChat(params: SocraticChatParams): Promise<string> {
    const { topic, branch, userLevel, messages } = params;
    this.logger.log(
      `socraticChat: topic="${topic}" branch=${branch} level=${userLevel} msgs=${messages.length}`,
    );

    try {
      const systemPrompt = buildSocraticTutorPrompt({
        topic,
        branch,
        userLevel,
        knowledgeContext: params.knowledgeContext,
      });

      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      return await this.chat(chatMessages, { maxTokens: 1024, userId: params.userId, operation: 'dialogue' });
    } catch (error) {
      this.logger.error(
        `socraticChat failed: topic="${topic}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'Произошла ошибка. Давай попробуем ещё раз — о чём ты хотел поговорить?';
    }
  }

  // ── extractConcepts — extract concepts from blogger content ───────

  async extractConcepts(
    text: string,
    source: string,
  ): Promise<ContentConcept[]> {
    this.logger.log(
      `extractConcepts: source="${source}" textLength=${text.length}`,
    );

    try {
      const prompt = `Ты — аналитик контента для интеллектуальной платформы "РАЗУМ".

## Задача
Извлеки ключевые концепты из текста блогера/эксперта для создания вопросов.

## Источник: ${source}

## Текст для анализа:
${text}

## Формат ответа
Верни ТОЛЬКО JSON-массив без markdown-обёртки. Каждый элемент:
{
  "concept": "Краткое название концепта",
  "claim": "Основное утверждение или тезис",
  "example": "Пример или иллюстрация из текста",
  "trust_level": "needs_validation | validated | opinion",
  "tags": ["тег1", "тег2"],
  "branch": "STRATEGY | LOGIC | ERUDITION | RHETORIC | INTUITION",
  "difficulty": "BRONZE | SILVER | GOLD"
}

## Правила
1. trust_level: "validated" — общеизвестные факты; "needs_validation" — спорные утверждения, требующие проверки; "opinion" — субъективное мнение автора
2. branch: "STRATEGY" — бизнес, управление, решения, переговоры; "LOGIC" — наука, логика, аналитика, технологии; "ERUDITION" — знания о мире, история, философия, психология, экономика, культура; "RHETORIC" — коммуникация, аргументация, переговоры, сторителлинг, убеждение; "INTUITION" — распознавание паттернов, вероятности, когнитивные искажения, эмоциональный интеллект
3. difficulty: "BRONZE" — базовый концепт; "SILVER" — требует понимания контекста; "GOLD" — сложный, многоуровневый
4. tags — 2-5 коротких тегов для категоризации
5. Извлекай только значимые концепты, не мелкие детали
6. Все тексты на русском языке

Верни JSON-массив концептов:`;

      const raw = await this.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 4096, operation: 'concept_extraction' },
      );

      const parsed = this.parseJsonArray<ContentConcept>(raw);
      const validated = parsed.filter((c) => this.isValidConcept(c));

      this.logger.log(
        `extractConcepts: parsed=${parsed.length} valid=${validated.length}`,
      );

      return validated;
    } catch (error) {
      this.logger.error(
        `extractConcepts failed: source="${source}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private parseJsonArray<T>(raw: string): T[] {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed) as T[];
      }
    } catch {
      // Fall through to regex fallback
    }

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      this.logger.warn('parseJsonArray: no JSON array found in response');
      return [];
    }

    try {
      return JSON.parse(match[0]) as T[];
    } catch {
      this.logger.warn('parseJsonArray: failed to parse extracted JSON array');
      return [];
    }
  }

  private isValidQuestion(q: unknown): q is GeneratedQuestion {
    if (typeof q !== 'object' || q === null) return false;
    const obj = q as Record<string, unknown>;
    return (
      typeof obj.text === 'string' &&
      obj.text.length > 0 &&
      Array.isArray(obj.options) &&
      obj.options.length === 4 &&
      obj.options.every((o: unknown) => typeof o === 'string' && o.length > 0) &&
      typeof obj.correctIndex === 'number' &&
      obj.correctIndex >= 0 &&
      obj.correctIndex <= 3 &&
      typeof obj.explanation === 'string' &&
      obj.explanation.length > 0
    );
  }

  private isValidConcept(c: unknown): c is ContentConcept {
    if (typeof c !== 'object' || c === null) return false;
    const obj = c as Record<string, unknown>;
    const validBranches = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];
    const validDifficulties = ['BRONZE', 'SILVER', 'GOLD'];
    const validTrustLevels = ['needs_validation', 'validated', 'opinion'];
    return (
      typeof obj.concept === 'string' &&
      obj.concept.length > 0 &&
      typeof obj.claim === 'string' &&
      obj.claim.length > 0 &&
      typeof obj.example === 'string' &&
      typeof obj.trust_level === 'string' &&
      validTrustLevels.includes(obj.trust_level) &&
      Array.isArray(obj.tags) &&
      obj.tags.every((t: unknown) => typeof t === 'string') &&
      typeof obj.branch === 'string' &&
      validBranches.includes(obj.branch) &&
      typeof obj.difficulty === 'string' &&
      validDifficulties.includes(obj.difficulty)
    );
  }
}
