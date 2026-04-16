import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

// ── Types ────────────────────────────────────────────────────────────────

export type DeliveryStyle = 'analytical' | 'practical' | 'philosophical';

export interface StyleModifiers {
  /** Тон подачи материала */
  tone: string;
  /** Стиль hook-карточки */
  hookStyle: string;
  /** Какие примеры предпочитает пользователь */
  examplePreference: string;
  /** Какие доказательства резонируют */
  evidenceType: string;
}

export interface ConceptInfo {
  nameRu: string;
  description: string;
  slug: string;
  branch?: string;
}

export interface QuizCustomization {
  questionFraming: string;
  distractorStyle: string;
  explanationStyle: string;
}

interface CardContent {
  text?: string;
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanations?: string[];
  prompt?: string;
  yesterday?: string | null;
  today?: string | null;
  tomorrow?: string | null;
  quote?: string;
  author?: string;
}

interface DailyCard {
  type: string;
  content: CardContent;
}

// ── Style definitions ────────────────────────────────────────────────────

const STYLE_MODIFIERS: Record<DeliveryStyle, StyleModifiers> = {
  analytical: {
    tone: 'научный и точный',
    hookStyle:
      'Начни с неожиданной статистики, числа или контринтуитивного факта. ' +
      'Формат: «X% людей ошибаются в...» или «Исследование Y показало, что...»',
    examplePreference:
      'Исследования, эксперименты, данные, графики, метрики. ' +
      'Предпочитает конкретные числа и воспроизводимые результаты.',
    evidenceType:
      'Научные исследования, мета-анализы, статистика, формальные модели. ' +
      'Ссылки на авторов и год публикации.',
  },
  practical: {
    tone: 'практичный и прямой',
    hookStyle:
      'Начни с конкретной жизненной ситуации или проблемы, знакомой каждому. ' +
      'Формат: «Представь: ты на переговорах и...» или «Когда ты последний раз...»',
    examplePreference:
      'Реальные бизнес-кейсы, истории успеха/провала, пошаговые инструкции. ' +
      'Предпочитает «как это использовать завтра».',
    evidenceType:
      'Практические кейсы, результаты компаний, истории реальных людей. ' +
      'Что сработало, что нет, и почему.',
  },
  philosophical: {
    tone: 'глубокий и философский',
    hookStyle:
      'Начни с фундаментального вопроса или парадокса. ' +
      'Формат: «Что если всё, что ты знаешь о X — иллюзия?» или «Аристотель 2400 лет назад заметил...»',
    examplePreference:
      'Исторические параллели, философские школы, эволюция идей через века. ' +
      'Предпочитает глубину и контекст — откуда пришла идея и куда ведёт.',
    evidenceType:
      'Философские традиции, исторический контекст, эволюция мысли. ' +
      'Связь с великими мыслителями и школами.',
  },
};

// ── Hook templates ───────────────────────────────────────────────────────

const HOOK_TEMPLATES: Record<DeliveryStyle, (concept: ConceptInfo) => string> = {
  analytical: (concept) =>
    `📊 Знаешь ли ты, что концепция «${concept.nameRu}» подтверждена десятками исследований? ` +
    `${concept.description} — и данные говорят об этом однозначно.`,

  practical: (concept) =>
    `🔧 «${concept.nameRu}» — это не теория из учебника. ` +
    `Это инструмент, который ты можешь применить уже сегодня. ${concept.description}`,

  philosophical: (concept) =>
    `🔮 «${concept.nameRu}» — идея, которая меняла цивилизации. ` +
    `${concept.description} Но что это значит для тебя лично?`,
};

// ── Explanation templates ────────────────────────────────────────────────

const EXPLANATION_TEMPLATES: Record<DeliveryStyle, (concept: ConceptInfo) => string> = {
  analytical: (concept) =>
    `${concept.nameRu} — ${concept.description}\n\n` +
    `Ключевые параметры:\n` +
    `• Определение: формальное описание механизма\n` +
    `• Условия применения: когда работает, когда нет\n` +
    `• Метрики: как измерить эффект`,

  practical: (concept) =>
    `${concept.nameRu} — ${concept.description}\n\n` +
    `Как это использовать:\n` +
    `1. Определи ситуацию, где это применимо\n` +
    `2. Примени базовый принцип\n` +
    `3. Оцени результат и скорректируй`,

  philosophical: (concept) =>
    `${concept.nameRu} — ${concept.description}\n\n` +
    `Эта идея уходит корнями в фундаментальные вопросы о природе человека и общества. ` +
    `Понимание её контекста — ключ к глубинному усвоению.`,
};

// ── Quiz customization ──────────────────────────────────────────────────

const QUIZ_CUSTOMIZATIONS: Record<DeliveryStyle, QuizCustomization> = {
  analytical: {
    questionFraming:
      'Сформулируй вопрос через данные или модель. ' +
      'Например: «Согласно модели X, какой фактор является определяющим для...»',
    distractorStyle:
      'Дистракторы — правдоподобные с точки зрения логики, но содержат подмену переменных, ' +
      'ошибку в каузальности или неверную интерпретацию данных.',
    explanationStyle:
      'Объяснение со ссылкой на конкретное исследование или модель. ' +
      'Покажи, какая логическая ошибка содержится в каждом дистракторе.',
  },
  practical: {
    questionFraming:
      'Сформулируй вопрос через жизненную ситуацию. ' +
      'Например: «Ты руководишь командой и замечаешь, что... Какое действие будет наиболее эффективным?»',
    distractorStyle:
      'Дистракторы — интуитивно привлекательные действия, которые кажутся правильными, ' +
      'но не учитывают важного нюанса или ведут к побочным эффектам.',
    explanationStyle:
      'Объяснение через последствия каждого варианта: «Если выбрать A, произойдёт X, ' +
      'потому что... Вариант B лучше, потому что...»',
  },
  philosophical: {
    questionFraming:
      'Сформулируй вопрос через концептуальное противоречие или парадокс. ' +
      'Например: «Парадокс X ставит под сомнение... Какое утверждение наиболее точно разрешает это противоречие?»',
    distractorStyle:
      'Дистракторы — частичные истины, упрощения сложных идей или ' +
      'распространённые философские заблуждения (соломенный человек, ложная дихотомия).',
    explanationStyle:
      'Объяснение через историю идеи: кто предложил, какой контекст, ' +
      'как эволюционировало понимание. Связь с другими концепциями.',
  },
};

// ── AI prompts for enhanced customization ────────────────────────────────

function buildCardCustomizationPrompt(
  cards: DailyCard[],
  conceptName: string,
  modifiers: StyleModifiers,
): string {
  return `Ты — наставник платформы РАЗУМ. Адаптируй карточки обучения под стиль подачи.

СТИЛЬ ПОДАЧИ:
- Тон: ${modifiers.tone}
- Hook-стиль: ${modifiers.hookStyle}
- Примеры: ${modifiers.examplePreference}
- Доказательства: ${modifiers.evidenceType}

КОНЦЕПТ: ${conceptName}

КАРТОЧКИ ДЛЯ АДАПТАЦИИ:
${JSON.stringify(cards, null, 2)}

ЗАДАЧА:
1. Перепиши текстовый контент каждой карточки, сохраняя структуру (type, поля content).
2. Hook — переписать в стиле hookStyle.
3. Explanation — адаптировать тон и глубину.
4. Evidence — подобрать доказательства нужного типа.
5. Example — подобрать пример нужного типа.
6. Quiz — переформулировать вопрос и дистракторы.
7. Explain — адаптировать промпт.
8. Wisdom — подобрать цитату, резонирующую со стилем.
9. Thread — оставить как есть.

ПРАВИЛА:
- Весь текст на русском языке.
- Сохрани ТОЧНО ту же JSON-структуру массива карточек.
- Верни ТОЛЬКО JSON-массив. Никакого текста до или после.`;
}

// ── Service ──────────────────────────────────────────────────────────────

@Injectable()
export class CardCustomizerService {
  private readonly logger = new Logger(CardCustomizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Customize a set of default cards for a user's delivery style.
   *
   * Uses AI when available, falls back to template-based customization.
   */
  async customizeCards(
    cards: DailyCard[],
    deliveryStyle: string,
    conceptName: string,
  ): Promise<DailyCard[]> {
    const style = this.normalizeStyle(deliveryStyle);
    const modifiers = this.getStyleModifiers(style);

    // Try AI-enhanced customization first
    try {
      const aiCards = await this.customizeWithAi(cards, conceptName, modifiers);
      if (aiCards.length === cards.length) {
        this.logger.log(
          `AI-customized ${aiCards.length} cards for style="${style}" concept="${conceptName}"`,
        );
        return aiCards;
      }
    } catch (error) {
      this.logger.warn(
        `AI customization failed for concept="${conceptName}", falling back to templates: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Fallback: template-based customization
    return this.customizeWithTemplates(cards, style, conceptName);
  }

  /**
   * Get style-specific prompt modifiers for a delivery style.
   */
  getStyleModifiers(deliveryStyle: string): StyleModifiers {
    const style = this.normalizeStyle(deliveryStyle);
    return STYLE_MODIFIERS[style];
  }

  /**
   * Generate a hook card text tailored to delivery style.
   */
  generateHook(concept: ConceptInfo, style: string): string {
    const normalized = this.normalizeStyle(style);
    return HOOK_TEMPLATES[normalized](concept);
  }

  /**
   * Generate an explanation card text tailored to delivery style.
   */
  generateExplanation(concept: ConceptInfo, style: string): string {
    const normalized = this.normalizeStyle(style);
    return EXPLANATION_TEMPLATES[normalized](concept);
  }

  /**
   * Get quiz customization directives for a delivery style.
   */
  customizeQuiz(concept: ConceptInfo, style: string): QuizCustomization {
    const normalized = this.normalizeStyle(style);
    return {
      ...QUIZ_CUSTOMIZATIONS[normalized],
      questionFraming: QUIZ_CUSTOMIZATIONS[normalized].questionFraming.replace(
        /X/g,
        concept.nameRu,
      ),
    };
  }

  // ── Private: AI-enhanced customization ────────────────────────────────

  private async customizeWithAi(
    cards: DailyCard[],
    conceptName: string,
    modifiers: StyleModifiers,
  ): Promise<DailyCard[]> {
    const prompt = buildCardCustomizationPrompt(cards, conceptName, modifiers);

    const raw = await this.aiService.chatCompletion(
      [{ role: 'user', content: prompt }],
      {
        operation: 'card_customization',
        maxTokens: 2048,
      },
    );

    const parsed = this.parseCardArray(raw);
    return parsed;
  }

  // ── Private: template-based customization ─────────────────────────────

  private customizeWithTemplates(
    cards: DailyCard[],
    style: DeliveryStyle,
    conceptName: string,
  ): DailyCard[] {
    const concept: ConceptInfo = {
      nameRu: conceptName,
      description: '',
      slug: '',
    };

    // Extract description from explanation card if available
    const explanationCard = cards.find((c) => c.type === 'explanation');
    if (explanationCard?.content.text) {
      concept.description = explanationCard.content.text;
    }

    return cards.map((card) => {
      switch (card.type) {
        case 'hook':
          return {
            ...card,
            content: { ...card.content, text: this.generateHook(concept, style) },
          };

        case 'explanation':
          return {
            ...card,
            content: {
              ...card.content,
              text: this.generateExplanation(concept, style),
            },
          };

        case 'evidence':
          return {
            ...card,
            content: {
              ...card.content,
              text: this.generateEvidenceText(concept, style),
            },
          };

        case 'example':
          return {
            ...card,
            content: {
              ...card.content,
              text: this.generateExampleText(concept, style),
            },
          };

        case 'quiz':
          return this.customizeQuizCard(card, concept, style);

        case 'explain':
          return {
            ...card,
            content: {
              ...card.content,
              prompt: this.generateExplainPrompt(concept, style),
            },
          };

        case 'wisdom':
          return {
            ...card,
            content: {
              ...card.content,
              ...this.generateWisdomContent(style),
            },
          };

        default:
          return card;
      }
    });
  }

  // ── Private: per-card-type template generators ────────────────────────

  private generateEvidenceText(concept: ConceptInfo, style: DeliveryStyle): string {
    const modifiers = STYLE_MODIFIERS[style];
    switch (style) {
      case 'analytical':
        return (
          `Научные данные по теме «${concept.nameRu}»:\n\n` +
          `Тип доказательств: ${modifiers.evidenceType}\n\n` +
          `Ключевые исследования и модели, подтверждающие эту концепцию, ` +
          `формируют доказательную базу для практического применения.`
        );
      case 'practical':
        return (
          `Почему «${concept.nameRu}» работает на практике:\n\n` +
          `${modifiers.evidenceType}\n\n` +
          `Реальные результаты показывают: те, кто применяет этот принцип, ` +
          `получают измеримое преимущество.`
        );
      case 'philosophical':
        return (
          `Исторический контекст «${concept.nameRu}»:\n\n` +
          `${modifiers.evidenceType}\n\n` +
          `Эта идея прошла проверку веками — от древних мыслителей до современных исследователей.`
        );
    }
  }

  private generateExampleText(concept: ConceptInfo, style: DeliveryStyle): string {
    switch (style) {
      case 'analytical':
        return (
          `Пример из исследований: применение «${concept.nameRu}» ` +
          `было зафиксировано в ряде экспериментов, демонстрирующих ` +
          `статистически значимый эффект на принятие решений.`
        );
      case 'practical':
        return (
          `Практический пример: представь, что ты применяешь «${concept.nameRu}» ` +
          `в рабочей ситуации. Вот конкретные шаги и результат, ` +
          `который ты можешь ожидать.`
        );
      case 'philosophical':
        return (
          `Исторический пример: концепция «${concept.nameRu}» ` +
          `сыграла ключевую роль в переломные моменты истории, ` +
          `когда великие лидеры применяли её для принятия судьбоносных решений.`
        );
    }
  }

  private customizeQuizCard(
    card: DailyCard,
    concept: ConceptInfo,
    style: DeliveryStyle,
  ): DailyCard {
    const quiz = this.customizeQuiz(concept, style);
    const baseQuestion = card.content.question || `Вопрос о «${concept.nameRu}»`;

    return {
      ...card,
      content: {
        ...card.content,
        question: baseQuestion || quiz.questionFraming,
      },
    };
  }

  private generateExplainPrompt(concept: ConceptInfo, style: DeliveryStyle): string {
    switch (style) {
      case 'analytical':
        return (
          `Объясни своими словами: как работает «${concept.nameRu}»? ` +
          `Опиши механизм и ключевые переменные.`
        );
      case 'practical':
        return (
          `Объясни своими словами: как ты бы применил «${concept.nameRu}» ` +
          `в реальной жизни? Приведи конкретный пример.`
        );
      case 'philosophical':
        return (
          `Объясни своими словами: в чём глубинный смысл «${concept.nameRu}»? ` +
          `Как эта идея связана с природой человеческого мышления?`
        );
    }
  }

  private generateWisdomContent(style: DeliveryStyle): { quote: string; author: string } {
    // Template placeholders — AI customization will replace these with real quotes
    switch (style) {
      case 'analytical':
        return {
          quote: 'Без данных вы просто ещё один человек с мнением.',
          author: 'У. Эдвардс Деминг',
        };
      case 'practical':
        return {
          quote: 'Видение без действия — это мечта. Действие без видения — кошмар.',
          author: 'Японская пословица',
        };
      case 'philosophical':
        return {
          quote: 'Я знаю, что ничего не знаю.',
          author: 'Сократ',
        };
    }
  }

  // ── Private: utilities ────────────────────────────────────────────────

  private normalizeStyle(style: string): DeliveryStyle {
    if (style === 'analytical' || style === 'practical' || style === 'philosophical') {
      return style;
    }
    this.logger.warn(`Unknown delivery style "${style}", defaulting to "practical"`);
    return 'practical';
  }

  private parseCardArray(raw: string): DailyCard[] {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed) as DailyCard[];
      }
    } catch {
      // Fall through to regex
    }

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      this.logger.warn('parseCardArray: no JSON array found in AI response');
      return [];
    }

    try {
      return JSON.parse(match[0]) as DailyCard[];
    } catch {
      this.logger.warn('parseCardArray: failed to parse extracted JSON array');
      return [];
    }
  }
}
