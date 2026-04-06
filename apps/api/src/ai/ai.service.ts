import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildQuestionGeneratorPrompt,
  QuestionGeneratorParams,
} from './prompts/question-generator';
import {
  buildSocraticTutorPrompt,
  SocraticTutorParams,
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
}

export interface ContentConcept {
  concept: string;
  claim: string;
  example: string;
  trust_level: 'needs_validation' | 'validated' | 'opinion';
  tags: string[];
  branch: 'STRATEGY' | 'LOGIC';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
}

@Injectable()
export class AiService {
  private client: Anthropic;
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  async generateExplanation(
    question: string,
    correctAnswer: string,
    userAnswer: string,
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Вопрос: "${question}"\nПравильный ответ: "${correctAnswer}"\nОтвет пользователя: "${userAnswer}"\n\nОбъясни кратко и понятно, почему правильный ответ именно такой. Если пользователь ответил неправильно, объясни его ошибку. Отвечай на русском языке.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      return textBlock ? textBlock.text : 'Объяснение недоступно.';
    } catch (error) {
      this.logger.error('Failed to generate AI explanation', error);
      return 'Не удалось сгенерировать объяснение.';
    }
  }

  async generateHint(question: string, options: string[]): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Вопрос: "${question}"\nВарианты: ${options.join(', ')}\n\nДай небольшую подсказку, не раскрывая правильный ответ напрямую. Отвечай на русском языке.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      return textBlock ? textBlock.text : 'Подсказка недоступна.';
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

      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        this.logger.warn('generateQuestions: empty response from Claude');
        return [];
      }

      this.logger.log(
        `generateQuestions: usage input=${message.usage.input_tokens} output=${message.usage.output_tokens}`,
      );

      const raw = textBlock.text;
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

      const anthropicMessages: Array<{
        role: 'user' | 'assistant';
        content: string;
      }> = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const textBlock = message.content.find((block) => block.type === 'text');

      this.logger.log(
        `socraticChat: usage input=${message.usage.input_tokens} output=${message.usage.output_tokens}`,
      );

      if (!textBlock || textBlock.type !== 'text') {
        return 'Давай продолжим наш разговор. О чём ты хотел бы поразмышлять?';
      }

      return textBlock.text;
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
  "branch": "STRATEGY | LOGIC",
  "difficulty": "BRONZE | SILVER | GOLD"
}

## Правила
1. trust_level: "validated" — общеизвестные факты; "needs_validation" — спорные утверждения, требующие проверки; "opinion" — субъективное мнение автора
2. branch: "STRATEGY" — бизнес, управление, решения, переговоры; "LOGIC" — наука, логика, аналитика, технологии
3. difficulty: "BRONZE" — базовый концепт; "SILVER" — требует понимания контекста; "GOLD" — сложный, многоуровневый
4. tags — 2-5 коротких тегов для категоризации
5. Извлекай только значимые концепты, не мелкие детали
6. Все тексты на русском языке

Верни JSON-массив концептов:`;

      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        this.logger.warn('extractConcepts: empty response from Claude');
        return [];
      }

      this.logger.log(
        `extractConcepts: usage input=${message.usage.input_tokens} output=${message.usage.output_tokens}`,
      );

      const raw = textBlock.text;
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
    // Try direct JSON.parse first
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed) as T[];
      }
    } catch {
      // Fall through to regex fallback
    }

    // Regex fallback: extract JSON array from response text
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
    const validBranches = ['STRATEGY', 'LOGIC'];
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
