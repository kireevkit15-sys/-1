/**
 * AI prompt templates for the Learning system.
 *
 * Three learning-specific prompts:
 * 1. Concept explanation — Socratic breakdown of a concept
 * 2. Barrier hint — nudge without giving away the answer
 * 3. Mini-quiz — generate 3-5 questions on a concept
 */

// ── Types ─────────────────────────────────────────────────────────────

type Branch = 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
type Difficulty = 'BRONZE' | 'SILVER' | 'GOLD';

export interface ConceptExplainParams {
  /** Название концепта */
  conceptName: string;
  /** Описание концепта */
  conceptDescription: string;
  /** Ветка знаний */
  branch: Branch;
  /** Уровень mastery (0.0-1.0), влияет на глубину */
  mastery: number;
  /** Стиль подачи из determination */
  deliveryStyle?: string;
  /** На что именно пользователь хочет получить объяснение */
  userQuestion?: string;
  /** Связанные концепты для контекста */
  relatedConcepts?: string[];
}

export interface BarrierHintParams {
  /** Текущий этап барьера */
  stage: 'recall' | 'connect' | 'apply' | 'defend';
  /** Название концепта, с которым трудность */
  conceptName: string;
  /** Описание концепта */
  conceptDescription: string;
  /** Текущий ответ пользователя (если есть) */
  userAttempt?: string;
  /** Номер попытки подсказки (1, 2, 3 — каждая всё конкретнее) */
  hintNumber: number;
}

export interface MiniQuizParams {
  /** Название концепта */
  conceptName: string;
  /** Описание концепта */
  conceptDescription: string;
  /** Ветка знаний */
  branch: Branch;
  /** Сложность */
  difficulty: Difficulty;
  /** Количество вопросов (3-5) */
  count: number;
  /** Существующие вопросы для антидубликации */
  existingQuestions?: string[];
}

// ── Branch short names ────────────────────────────────────────────────

const BRANCH_RU: Record<Branch, string> = {
  STRATEGY: 'Стратегия',
  LOGIC: 'Логика',
  ERUDITION: 'Эрудиция',
  RHETORIC: 'Риторика',
  INTUITION: 'Интуиция',
};

// ── 1. Concept Explanation Prompt ─────────────────────────────────────

export function buildConceptExplainPrompt(params: ConceptExplainParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const {
    conceptName,
    conceptDescription,
    branch,
    mastery,
    deliveryStyle,
    userQuestion,
    relatedConcepts,
  } = params;

  const depthGuide =
    mastery < 0.2
      ? `Пользователь только начинает изучение. Объясняй с нуля: простые аналогии, бытовые примеры, минимум терминологии. Начни с самого базового «что это и зачем».`
      : mastery < 0.5
        ? `Пользователь знаком с основами. Углубляйся: покажи механизмы, объясни «как это работает», приведи кейс из реальной жизни.`
        : mastery < 0.8
          ? `Пользователь хорошо знает тему. Дай продвинутый ракурс: неочевидные связи, контраргументы, ограничения концепта, сравнение со смежными идеями.`
          : `Пользователь близок к мастерству. Дай экспертный взгляд: edge-cases, критика концепта, синтез с другими областями, мета-анализ.`;

  const styleGuide =
    deliveryStyle === 'analytical'
      ? 'Стиль: аналитический. Используй структуру, логические цепочки, данные и исследования.'
      : deliveryStyle === 'philosophical'
        ? 'Стиль: философский. Используй глубокие вопросы, парадоксы, связи с философскими школами.'
        : 'Стиль: практический. Используй примеры, кейсы, конкретные сценарии из жизни.';

  const relatedBlock =
    relatedConcepts && relatedConcepts.length > 0
      ? `\nСВЯЗАННЫЕ КОНЦЕПТЫ (покажи связи при объяснении):\n${relatedConcepts.map((c) => `- ${c}`).join('\n')}`
      : '';

  const systemPrompt = `Ты — наставник платформы РАЗУМ, объясняешь концепт ученику.

КОНЦЕПТ: "${conceptName}"
Описание: ${conceptDescription}
Ветка: ${BRANCH_RU[branch]}

ГЛУБИНА ОБЪЯСНЕНИЯ:
${depthGuide}

${styleGuide}
${relatedBlock}

ПРИНЦИПЫ:
1. Сократический метод: начинай с вопроса, ведущего к пониманию, затем раскрывай суть.
2. Один главный тезис, один пример, один вывод.
3. Завершай практическим применением: «Как это использовать».
4. Максимум 300 слов.
5. Не используй списки и форматирование — веди живой диалог.
6. Обращайся на «ты».
7. Не используй эмодзи.

ФОРМАТ ОТВЕТА — JSON:
{
  "explanation": "текст объяснения",
  "keyInsight": "главная мысль в одном предложении",
  "practicalTip": "как применить в жизни (1 предложение)",
  "followUpQuestion": "вопрос для углубления понимания"
}

Верни ТОЛЬКО валидный JSON.`;

  const userPrompt = userQuestion
    ? `Объясни концепт "${conceptName}". Вопрос ученика: ${userQuestion}`
    : `Объясни концепт "${conceptName}" — суть, пример, применение.`;

  return { systemPrompt, userPrompt };
}

// ── 2. Barrier Hint Prompt ────────────────────────────────────────────

export function buildBarrierHintPrompt(params: BarrierHintParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const { stage, conceptName, conceptDescription, userAttempt, hintNumber } = params;

  const stageContext: Record<string, string> = {
    recall: `Этап «Припоминание». Ученик должен вспомнить суть концепта "${conceptName}" своими словами.`,
    connect: `Этап «Связи». Ученик должен объяснить, как концепт "${conceptName}" связан с другим концептом.`,
    apply: `Этап «Применение». Ученик должен применить концепт "${conceptName}" к новой ситуации.`,
    defend: `Этап «Защита». Ученик должен аргументированно защитить позицию, используя концепт "${conceptName}".`,
  };

  const hintDepth =
    hintNumber <= 1
      ? `Дай МИНИМАЛЬНУЮ подсказку. Не раскрывай ответ. Лишь направь мышление в правильную сторону. Пример: «Подумай о том, что отличает это от...» или «Вспомни, какой принцип лежит в основе...»`
      : hintNumber === 2
        ? `Дай СРЕДНЮЮ подсказку. Укажи на конкретный аспект концепта, который поможет ответить, но не давай ответ напрямую. Можешь привести аналогию.`
        : `Дай МАКСИМАЛЬНУЮ подсказку. Раскрой ключевую идею концепта, дай наводящий пример. Ученик должен лишь сформулировать ответ самостоятельно.`;

  const systemPrompt = `Ты — наставник платформы РАЗУМ. Ученик проходит барьерное испытание и застрял.

${stageContext[stage]}

КОНЦЕПТ: "${conceptName}"
Описание: ${conceptDescription}

УРОВЕНЬ ПОДСКАЗКИ (${hintNumber} из 3):
${hintDepth}

ПРИНЦИПЫ:
1. НИКОГДА не давай готовый ответ. Подводи к нему.
2. Будь кратким — максимум 2-3 предложения.
3. Обращайся на «ты».
4. Тон: поддерживающий, но требовательный.

ФОРМАТ ОТВЕТА — JSON:
{
  "hint": "текст подсказки",
  "direction": "в каком направлении думать (1 предложение)"
}

Верни ТОЛЬКО валидный JSON.`;

  const userPrompt = userAttempt
    ? `Ученик попробовал ответить: "${userAttempt}". Ему нужна подсказка.`
    : `Ученик застрял и не знает, с чего начать. Дай подсказку.`;

  return { systemPrompt, userPrompt };
}

// ── 3. Mini-Quiz Prompt ──────────────────────────────────────────────

export function buildMiniQuizPrompt(params: MiniQuizParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const {
    conceptName,
    conceptDescription,
    branch,
    difficulty,
    count,
    existingQuestions,
  } = params;

  const difficultyGuide: Record<Difficulty, string> = {
    BRONZE: `Уровень BRONZE: проверь знание определений и базовых фактов. Вопросы прямые.`,
    SILVER: `Уровень SILVER: проверь умение применять концепт. Вопросы ситуационные.`,
    GOLD: `Уровень GOLD: проверь синтез и оценку. Вопросы на критическое мышление.`,
  };

  const antiDuplication =
    existingQuestions && existingQuestions.length > 0
      ? `\nАНТИДУБЛИКАЦИЯ — эти вопросы уже были, НЕ повторяй:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const systemPrompt = `Ты — составитель мини-квизов для платформы РАЗУМ.

КОНЦЕПТ: "${conceptName}"
Описание: ${conceptDescription}
Ветка: ${BRANCH_RU[branch]}

${difficultyGuide[difficulty]}

ПРАВИЛА:
1. Генерируй ровно ${count} вопросов.
2. Каждый вопрос — 4 варианта ответа, только 1 правильный.
3. correctIndex варьируется от 0 до 3.
4. Объяснение — 1-2 предложения, почему правильный ответ верен.
5. Вопросы должны раскрывать РАЗНЫЕ аспекты концепта.
6. Язык: русский.
7. Не выдумывай факты, исследования, авторов.
${antiDuplication}

ФОРМАТ ОТВЕТА — JSON-массив:
[
  {
    "text": "Текст вопроса",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Почему этот ответ верен"
  }
]

Верни ТОЛЬКО валидный JSON-массив из ${count} элементов.`;

  const userPrompt = `Сгенерируй ${count} вопросов по концепту "${conceptName}" (${BRANCH_RU[branch]}, ${difficulty}).`;

  return { systemPrompt, userPrompt };
}
