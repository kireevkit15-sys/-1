/**
 * AI prompt templates for generating feed card content.
 *
 * AI-generated card types: INSIGHT, CHALLENGE, CASE, WISDOM.
 * System-generated card types (not here): SPARRING, FORGE, ARENA.
 *
 * Usage:
 *   const { systemPrompt, userPrompt, temperature } = buildInsightPrompt({
 *     topic: 'Когнитивные искажения',
 *     branch: 'LOGIC',
 *     difficulty: 'SILVER',
 *   });
 *   // pass systemPrompt as system, userPrompt as user message to Claude/Gemini
 */

// ── Types ─────────────────────────────────────────────────────────────

type Branch = 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
type Difficulty = 'BRONZE' | 'SILVER' | 'GOLD';

export interface PromptPair {
  systemPrompt: string;
  userPrompt: string;
  /** Recommended temperature for the AI model */
  temperature: number;
}

// ── Expected response types ──────────────────────────────────────────

export interface InsightResponse {
  title: string;
  body: string;
  example: string;
  source: string;
}

export interface CaseResponse {
  scenario: string;
  question: string;
  options: string[];
  bestOptionIndex: number;
  analysis: string;
  realExample: string;
}

export interface WisdomResponse {
  quote: string;
  author: string;
  authorTitle: string;
  context: string;
}

export interface ChallengeResponse {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

export interface CampaignCardPlan {
  orderInDay: number;
  type: 'INSIGHT' | 'CHALLENGE' | 'CASE' | 'WISDOM' | 'SPARRING' | 'ARENA';
  topic: string;
  difficulty: Difficulty | null;
}

export interface CampaignDayPlan {
  dayNumber: number;
  theme: string;
  cards: CampaignCardPlan[];
}

export interface CampaignResponse {
  title: string;
  description: string;
  days: CampaignDayPlan[];
}

// ── Branch descriptions (exported for external use) ──────────────────

export const BRANCH_DESCRIPTIONS: Record<Branch, string> = {
  STRATEGY:
    'Стратегия — принятие решений, планирование, управление ресурсами, целеполагание, переговоры, лидерство, финансовое мышление. Темы: теория игр, ментальные модели (инверсия, second-order thinking), стратегическое планирование, SWOT/PEST, управление рисками, переговорные фреймворки (BATNA, ZOPA), финансовая грамотность, тайм-менеджмент.',
  LOGIC:
    'Логика — критическое мышление, когнитивные искажения, аргументация, формальная и неформальная логика, анализ данных, научный метод. Темы: логические ошибки (ad hominem, strawman, false dilemma), когнитивные искажения (confirmation bias, anchoring, Dunning-Kruger), байесовское мышление, статистическая грамотность, системы Канемана (Система 1 / Система 2).',
  ERUDITION:
    'Эрудиция — знания о мире, наука, история, философия, психология, экономика, культура. Темы: ключевые научные открытия, исторические поворотные моменты, философские школы (стоицизм, экзистенциализм), экономические модели, психологические теории, культурные паттерны.',
  RHETORIC:
    'Риторика — коммуникация, аргументация, переговоры, публичные выступления, сторителлинг, убеждение. Темы: структура аргумента (тезис-антитезис-синтез), принципы влияния Чалдини, фреймворки публичных выступлений, активное слушание, невербальная коммуникация, техники обратной связи.',
  INTUITION:
    'Интуиция — распознавание паттернов, вероятности, когнитивные искажения, эмоциональный интеллект, быстрое мышление. Темы: эвристики (доступность, репрезентативность), вероятностное мышление, распознавание паттернов, эмоциональный интеллект (модель Гоулмана), gut feeling vs analysis, байесовская интуиция.',
};

/** Short branch names in Russian */
const BRANCH_RU: Record<Branch, string> = {
  STRATEGY: 'Стратегия',
  LOGIC: 'Логика',
  ERUDITION: 'Эрудиция',
  RHETORIC: 'Риторика',
  INTUITION: 'Интуиция',
};

// ── Difficulty descriptors (Bloom's taxonomy) ─────────────────────────

const DIFFICULTY_RULES: Record<Difficulty, string> = {
  BRONZE: `Уровень BRONZE (узнавание и припоминание по таксономии Блума).
- Проверяет знание базовых определений, терминов, простых концепций.
- Правильный ответ очевиден для человека, знакомого с темой.
- Дистракторы содержат распространённые заблуждения и подмену понятий.
- Формулировка прямая: «Что такое...», «Какой термин описывает...»`,

  SILVER: `Уровень SILVER (применение и анализ по таксономии Блума).
- Вопрос описывает конкретную жизненную ситуацию и требует применения концепции.
- Нужно не просто знать определение, а уметь перенести теорию на практику.
- Дистракторы — правдоподобные, но ошибочные стратегии.
- Формулировка: «В ситуации X, какой подход будет наиболее эффективным...»`,

  GOLD: `Уровень GOLD (синтез и оценка по таксономии Блума).
- Вопрос требует синтеза нескольких концепций или распознавания нескольких ошибок.
- Может содержать кейс с неочевидным правильным ответом.
- Дистракторы — частично верные утверждения, ловушки для поверхностного мышления.
- Формулировка: «Какая комбинация принципов...», «Что является корневой причиной...»`,
};

/** Warrior rank descriptions for campaign difficulty scaling */
const RANK_DESCRIPTIONS: Record<string, string> = {
  NOVICE: 'Новичок (0-500 XP) — базовые концепции, простые примеры, минимум терминологии.',
  WARRIOR: 'Воин (500-2000 XP) — знаком с основами, готов к практическим кейсам.',
  GLADIATOR: 'Гладиатор (2000-5000 XP) — уверенное владение концепциями, сложные кейсы.',
  STRATEGIST: 'Стратег (5000-15000 XP) — глубокое понимание, синтез нескольких областей.',
  SPARTAN: 'Спартанец (15000+ XP) — экспертный уровень, нетривиальные задачи, edge-cases.',
};

// ── Shared generation rules ───────────────────────────────────────────

export const CARD_GENERATION_RULES = {
  language: 'Russian (русский язык)',
  targetAudience:
    'Мужчины 20-35 лет с практическим складом ума. Контексты: карьера, финансы, отношения, здоровье, переговоры, самоорганизация, личное развитие.',
  tone: 'Авторитетный, но доступный. Как умный наставник, который уважает собеседника. Без менторства сверху вниз, без панибратства.',
  qualityStandards: [
    'Каждая единица контента должна давать практическую пользу — не абстрактную теорию, а применимое знание.',
    'Примеры из реальной жизни, бизнеса, истории, науки — не выдуманные ситуации.',
    'Академические источники: ссылки на реальных авторов, исследования, книги.',
    'Текст структурирован, легко читается с мобильного устройства (короткие абзацы, ясные формулировки).',
    'Каждый контент-блок самодостаточен — его можно понять без контекста предыдущих карточек.',
  ],
  antiPatterns: [
    'НЕ использовать кликбейтные заголовки и манипулятивные формулировки.',
    'НЕ использовать гендерные стереотипы, токсичную маскулинность, pick-up терминологию.',
    'НЕ упрощать до банальности — аудитория умная, ценит глубину.',
    'НЕ выдумывать цитаты, авторов, исследования — только реальные.',
    'НЕ использовать канцелярит, штампы, воду.',
    'НЕ давать непрошенные мотивационные речи.',
    'НЕ копировать стиль инфоцыганских курсов.',
  ],
} as const;

/** Serialized rules block for inclusion in prompts */
function rulesBlock(): string {
  return `ОБЩИЕ ПРАВИЛА ГЕНЕРАЦИИ:
- Язык: ${CARD_GENERATION_RULES.language}
- Целевая аудитория: ${CARD_GENERATION_RULES.targetAudience}
- Тон: ${CARD_GENERATION_RULES.tone}

СТАНДАРТЫ КАЧЕСТВА:
${CARD_GENERATION_RULES.qualityStandards.map((s, i) => `${i + 1}. ${s}`).join('\n')}

АНТИПАТТЕРНЫ (чего НЕ делать):
${CARD_GENERATION_RULES.antiPatterns.map((s) => `- ${s}`).join('\n')}`;
}

// ── Context block helper ──────────────────────────────────────────────

function contextBlock(context?: string): string {
  if (!context) return '';
  return `

ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ:
Используй следующий материал как источник идей. Не копируй дословно, но опирайся на факты и концепции:
---
${context}
---`;
}

// ── Anti-duplication block helper ─────────────────────────────────────

function antiDuplicationBlock(label: string, existing: string[]): string {
  if (!existing || existing.length === 0) return '';
  const listed = existing
    .slice(-30) // limit to last 30 to stay within token limits
    .map((item, i) => `  ${i + 1}. ${item}`)
    .join('\n');
  return `

АНТИДУБЛИКАЦИЯ:
Следующие ${label} уже существуют. НЕ повторяй их смысл, формулировки и ситуации:
${listed}

Каждый новый элемент должен раскрывать ДРУГОЙ аспект темы, использовать ДРУГУЮ ситуацию и ДРУГУЮ формулировку.`;
}

// ── Concepts block helper ─────────────────────────────────────────────

function conceptsBlock(concepts: string[]): string {
  if (!concepts || concepts.length === 0) return '';
  return `
КОНЦЕПЦИИ ДЛЯ ИСПОЛЬЗОВАНИЯ:
Опирайся на следующие концепции при создании контента:
${concepts.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`;
}

// ── Difficulty block helper for content depth ─────────────────────────

function difficultyContextBlock(difficulty: Difficulty): string {
  const mapping: Record<Difficulty, string> = {
    BRONZE:
      'Уровень BRONZE: объясняй простым языком, начинай с базовых определений. Пример — максимально наглядный и бытовой.',
    SILVER:
      'Уровень SILVER: предполагай знакомство с основами. Углубляйся в нюансы, показывай неочевидные связи. Пример — из бизнеса или профессиональной среды.',
    GOLD:
      'Уровень GOLD: пиши для подготовленного читателя. Синтезируй несколько концепций, раскрывай edge-cases и контринтуитивные выводы. Пример — из научных исследований или сложных бизнес-кейсов.',
  };
  return mapping[difficulty];
}

// ── 1. INSIGHT Card Prompt ────────────────────────────────────────────

export interface InsightPromptParams {
  topic: string;
  branch: Branch;
  difficulty: Difficulty;
  existingInsights?: string[];
  context?: string;
}

export function buildInsightPrompt(params: InsightPromptParams): PromptPair;
/** @deprecated Use params object. Kept for backward compatibility. */
export function buildInsightPrompt(topic: string, branch: Branch, context?: string): PromptPair;
export function buildInsightPrompt(
  topicOrParams: string | InsightPromptParams,
  branchArg?: Branch,
  contextArg?: string,
): PromptPair {
  // Normalize to params object
  const params: InsightPromptParams =
    typeof topicOrParams === 'string'
      ? { topic: topicOrParams, branch: branchArg!, difficulty: 'SILVER', context: contextArg }
      : topicOrParams;

  const { topic, branch, difficulty, existingInsights, context } = params;

  const systemPrompt = `Ты — эксперт-составитель образовательного контента для интеллектуальной платформы РАЗУМ.
Твоя задача — создавать INSIGHT-карточки: концептуальные карточки, которые дают новое знание через понятное объяснение и практический пример.

${rulesBlock()}

ГЛУБИНА КОНТЕНТА:
${difficultyContextBlock(difficulty)}

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки, без комментариев:
{
  "title": "Краткий, цепляющий заголовок (5-8 слов)",
  "body": "Объяснение концепции в 2-3 абзаца. Markdown допустим. Первый абзац — суть концепции. Второй — почему это важно и как работает. Третий — как это применять в жизни.",
  "example": "Конкретный пример из реальной жизни, бизнеса или истории. 1-2 абзаца.",
  "source": "Ссылка на академический источник: автор, книга/исследование, год"
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект. Никакого текста до или после.
- body: 2-3 абзаца, разделённых двойным переносом строки.
- example: реальный пример, не выдуманный. Укажи имена, компании, даты.
- source: реальный источник. Если точный источник неизвестен, укажи наиболее релевантную академическую работу по теме.
- title: без кликбейта, но с интригой — чтобы хотелось прочитать.`;

  const userPrompt = `Создай INSIGHT-карточку.

Тема: ${topic}
Ветка знаний: ${BRANCH_RU[branch]} (${BRANCH_DESCRIPTIONS[branch]})
${contextBlock(context)}${antiDuplicationBlock('заголовки инсайтов', existingInsights ?? [])}
Сгенерируй карточку:`;

  return { systemPrompt, userPrompt, temperature: 0.7 };
}

// ── 2. CASE Card Prompt ──────────────────────────────────────────────

export interface CasePromptParams {
  topic: string;
  branch: Branch;
  concepts?: string[];
  context?: string;
}

export function buildCasePrompt(params: CasePromptParams): PromptPair;
/** @deprecated Use params object. Kept for backward compatibility. */
export function buildCasePrompt(topic: string, branch: Branch, context?: string): PromptPair;
export function buildCasePrompt(
  topicOrParams: string | CasePromptParams,
  branchArg?: Branch,
  contextArg?: string,
): PromptPair {
  const params: CasePromptParams =
    typeof topicOrParams === 'string'
      ? { topic: topicOrParams, branch: branchArg!, context: contextArg }
      : topicOrParams;

  const { topic, branch, concepts, context } = params;

  const systemPrompt = `Ты — эксперт по кейс-методу для интеллектуальной платформы РАЗУМ.
Твоя задача — создавать CASE-карточки: реальные ситуации с вопросом «Что бы ты сделал?» и подробным разбором.

${rulesBlock()}

ТРЕБОВАНИЯ К КЕЙСУ:
1. scenario — описание реальной ситуации (2-3 абзаца). Конкретные детали: имена, числа, контекст. Ситуация должна быть узнаваемой — бизнес, переговоры, жизненные решения, карьера.
2. question — вопрос формата «Что бы ты сделал?» или «Какой подход выберешь?».
3. options — 3-4 варианта действий. Все правдоподобные, но один объективно лучший.
4. bestOptionIndex — индекс лучшего варианта (от 0).
5. analysis — подробный разбор каждого варианта (3-4 абзаца). Почему лучший вариант лучше, чем остальные. Со ссылками на теорию.
6. realExample — реальный аналогичный случай из бизнеса, истории, спорта (если есть).

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки, без комментариев:
{
  "scenario": "Описание ситуации. Конкретные детали, контекст, ставки.",
  "question": "Как поступишь в этой ситуации?",
  "options": ["Вариант действий A", "Вариант действий B", "Вариант действий C"],
  "bestOptionIndex": 0,
  "analysis": "Подробный разбор всех вариантов. Markdown допустим. 3-4 абзаца.",
  "realExample": "Реальный аналогичный случай с именами, датами, результатами."
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект. Никакого текста до или после.
- options — массив из 3 или 4 строк.
- bestOptionIndex — число от 0 до длины options - 1.
- scenario должен быть достаточно детальным, чтобы принять осмысленное решение.
- analysis должен разбирать ВСЕ варианты, не только правильный.
- realExample может быть null, если аналогичного случая нет, но лучше найти.
- НЕ выдумывай реальные примеры. Если пишешь про конкретную компанию или человека — это должен быть реальный случай.`;

  const userPrompt = `Создай CASE-карточку.

Тема: ${topic}
Ветка знаний: ${BRANCH_RU[branch]} (${BRANCH_DESCRIPTIONS[branch]})
${conceptsBlock(concepts ?? [])}${contextBlock(context)}
Сгенерируй кейс:`;

  return { systemPrompt, userPrompt, temperature: 0.7 };
}

// ── 3. WISDOM Card Prompt ────────────────────────────────────────────

export interface WisdomPromptParams {
  branch: Branch;
  topic: string;
}

export function buildWisdomPrompt(params: WisdomPromptParams): PromptPair;
/** @deprecated Use params object. Kept for backward compatibility. */
export function buildWisdomPrompt(topic: string, branch: Branch): PromptPair;
export function buildWisdomPrompt(
  topicOrParams: string | WisdomPromptParams,
  branchArg?: Branch,
): PromptPair {
  const branch: Branch =
    typeof topicOrParams === 'string' ? branchArg! : topicOrParams.branch;
  const topic: string =
    typeof topicOrParams === 'string' ? topicOrParams : topicOrParams.topic;

  const systemPrompt = `Ты — куратор мудрости для интеллектуальной платформы РАЗУМ.
Твоя задача — создавать WISDOM-карточки: цитаты великих мыслителей с контекстом и связью с темой изучения.

${rulesBlock()}

ТРЕБОВАНИЯ К ЦИТАТЕ:
1. quote — реальная цитата реального человека. НЕ выдумывать. Если точная формулировка неизвестна, используй хорошо задокументированную версию.
2. author — полное имя автора.
3. authorTitle — краткое описание автора (2-5 слов). Примеры: «Древнеримский император-философ», «Основатель Amazon», «Нобелевский лауреат по экономике».
4. context — 2-3 предложения, объясняющих связь цитаты с текущей темой изучения. Почему это важно, как применить в жизни.

ДОПУСТИМЫЕ АВТОРЫ (категории):
- Философы: Сенека, Марк Аврелий, Аристотель, Конфуций, Ницше, Кант и др.
- Стратеги: Сунь-Цзы, Клаузевиц, Макиавелли и др.
- Учёные: Эйнштейн, Фейнман, Канеман, Талеб и др.
- Бизнес-лидеры: Джефф Безос, Рэй Далио, Чарли Мангер, Питер Друкер и др.
- Писатели и мыслители: Достоевский, Толстой, Оруэлл, Нассим Талеб и др.

АНТИ-ГАЛЛЮЦИНАЦИЯ:
- Используй ТОЛЬКО цитаты, которые ты уверен, что существуют.
- Если не уверен в точной формулировке — используй наиболее известную версию.
- Лучше дать хорошо задокументированную цитату, чем придумать красивую.
- Предпочитай цитаты из опубликованных книг, речей, интервью.

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки, без комментариев:
{
  "quote": "Текст цитаты на русском языке",
  "author": "Имя Автора",
  "authorTitle": "Краткое описание автора",
  "context": "Связь цитаты с темой и её практическая ценность"
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект. Никакого текста до или после.
- Цитата ДОЛЖНА быть реальной. Не выдумывай.
- Если оригинал на другом языке — дай качественный русский перевод.
- context должен связывать цитату с конкретной темой, а не быть общим.`;

  const userPrompt = `Создай WISDOM-карточку.

Тема: ${topic}
Ветка знаний: ${BRANCH_RU[branch]} (${BRANCH_DESCRIPTIONS[branch]})

Подбери цитату, которая раскрывает суть темы "${topic}" в контексте ветки "${BRANCH_RU[branch]}".
Сгенерируй карточку:`;

  return { systemPrompt, userPrompt, temperature: 0.3 };
}

// ── 4. CHALLENGE Card Prompt ─────────────────────────────────────────

export interface ChallengePromptParams {
  topic: string;
  branch: Branch;
  difficulty: Difficulty;
  concepts?: string[];
  existingQuestions?: string[];
  context?: string;
}

export function buildChallengePrompt(params: ChallengePromptParams): PromptPair;
/** @deprecated Use params object. Kept for backward compatibility. */
export function buildChallengePrompt(
  topic: string,
  branch: Branch,
  difficulty: Difficulty,
  context?: string,
): PromptPair;
export function buildChallengePrompt(
  topicOrParams: string | ChallengePromptParams,
  branchArg?: Branch,
  difficultyArg?: Difficulty,
  contextArg?: string,
): PromptPair {
  const params: ChallengePromptParams =
    typeof topicOrParams === 'string'
      ? {
          topic: topicOrParams,
          branch: branchArg!,
          difficulty: difficultyArg!,
          context: contextArg,
        }
      : topicOrParams;

  const { topic, branch, difficulty, concepts, existingQuestions, context } = params;

  const xpReward = difficulty === 'BRONZE' ? 10 : difficulty === 'SILVER' ? 15 : 25;

  const systemPrompt = `Ты — эксперт-составитель вопросов для интеллектуальной платформы РАЗУМ.
Твоя задача — создавать CHALLENGE-карточки: вопросы для проверки знаний с 4 вариантами ответа.

${rulesBlock()}

УРОВЕНЬ СЛОЖНОСТИ:
${DIFFICULTY_RULES[difficulty]}

ТРЕБОВАНИЯ К ВОПРОСУ:
1. Вопрос — ситуационный, не тривиальный. Описывает конкретную жизненную ситуацию.
2. Ровно 4 варианта ответа. Только ОДИН правильный.
3. Неправильные варианты (дистракторы) — правдоподобные, содержат распространённые заблуждения.
4. correctIndex варьируется от 0 до 3.
5. explanation — содержательное объяснение на 2-4 предложения с ссылкой на источник.
6. xpReward = ${xpReward} (фиксировано для сложности ${difficulty}).

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки, без комментариев:
{
  "text": "Текст вопроса с описанием ситуации",
  "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
  "correctIndex": 0,
  "explanation": "Развёрнутое объяснение правильного ответа со ссылкой на источник",
  "xpReward": ${xpReward}
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON объект. Никакого текста до или после.
- options — массив ровно из 4 строк.
- correctIndex — число от 0 до 3.
- xpReward — всегда ${xpReward}.`;

  const userPrompt = `Создай CHALLENGE-карточку.

Тема: ${topic}
Ветка знаний: ${BRANCH_RU[branch]} (${BRANCH_DESCRIPTIONS[branch]})
Сложность: ${difficulty}
${conceptsBlock(concepts ?? [])}${antiDuplicationBlock('вопросы', existingQuestions ?? [])}${contextBlock(context)}
Сгенерируй вопрос:`;

  return { systemPrompt, userPrompt, temperature: 0.3 };
}

// ── 5. Campaign Prompt ───────────────────────────────────────────────

export interface CampaignPromptParams {
  topic: string;
  branch: Branch;
  durationDays: number;
  rank: string;
  description?: string;
}

export function buildCampaignPrompt(params: CampaignPromptParams): PromptPair;
/** @deprecated Use params object. Kept for backward compatibility. */
export function buildCampaignPrompt(
  title: string,
  branch: Branch,
  durationDays: number,
  description: string,
): PromptPair;
export function buildCampaignPrompt(
  titleOrParams: string | CampaignPromptParams,
  branchArg?: Branch,
  durationDaysArg?: number,
  descriptionArg?: string,
): PromptPair {
  const params: CampaignPromptParams =
    typeof titleOrParams === 'string'
      ? {
          topic: titleOrParams,
          branch: branchArg!,
          durationDays: durationDaysArg!,
          rank: 'WARRIOR',
          description: descriptionArg,
        }
      : titleOrParams;

  const { topic, branch, durationDays, rank, description } = params;

  const rankDesc = RANK_DESCRIPTIONS[rank] ?? RANK_DESCRIPTIONS['WARRIOR'];

  const systemPrompt = `Ты — архитектор образовательных кампаний для интеллектуальной платформы РАЗУМ.
Твоя задача — спроектировать структуру кампании (курса), распределив карточки по дням с нарастающей сложностью и нарративной аркой.

${rulesBlock()}

УРОВЕНЬ ПОЛЬЗОВАТЕЛЯ:
${rankDesc}
Адаптируй глубину контента и сложность вопросов под этот уровень.

ТИПЫ КАРТОЧЕК:
- INSIGHT — концептуальная карточка, даёт новое знание (AI-генерируемая)
- CHALLENGE — вопрос с вариантами ответа (AI-генерируемая)
- CASE — кейс-разбор реальной ситуации (AI-генерируемая)
- WISDOM — цитата мыслителя с контекстом (AI-генерируемая)
- SPARRING — мини-бой (системная, просто укажи место)
- ARENA — приглашение в полноценный бой (системная, просто укажи место)

СТРУКТУРА КАМПАНИИ:
1. День 1 (Введение): 4-5 INSIGHT карточек + 1 CHALLENGE (BRONZE) + 1 WISDOM. Познакомить с темой.
2. Дни 2-N-1 (Развитие): микс из INSIGHT (2-3) + CHALLENGE (2-3, сложность растёт) + CASE (1) + WISDOM (1) + SPARRING (1). Углубление, практика.
3. Последний день (Мастерство): CHALLENGE (3-4, GOLD) + CASE (1) + 1 ARENA. Финальная проверка.

ПРОГРЕССИЯ СЛОЖНОСТИ:
- День 1: CHALLENGE только BRONZE
- Дни 2-3: CHALLENGE BRONZE + SILVER
- Середина: CHALLENGE SILVER
- Предпоследние: CHALLENGE SILVER + GOLD
- Последний: CHALLENGE GOLD

НАРРАТИВНАЯ АРКА:
- Каждый день имеет под-тему внутри общей темы кампании.
- Карточки внутри дня логически связаны.
- INSIGHT идёт перед CHALLENGE по той же под-теме (сначала учим, потом проверяем).

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки:
{
  "title": "Название кампании",
  "description": "Описание кампании (2-3 предложения): что узнает и чему научится пользователь",
  "days": [
    {
      "dayNumber": 1,
      "theme": "Название подтемы дня",
      "cards": [
        {
          "orderInDay": 1,
          "type": "INSIGHT",
          "topic": "Конкретная тема для генерации этой карточки",
          "difficulty": null
        },
        {
          "orderInDay": 2,
          "type": "CHALLENGE",
          "topic": "Конкретная тема вопроса",
          "difficulty": "BRONZE"
        }
      ]
    }
  ]
}

КРИТИЧЕСКИ ВАЖНО:
- Верни ТОЛЬКО валидный JSON. Никакого текста до или после.
- type — одно из: INSIGHT, CHALLENGE, CASE, WISDOM, SPARRING, ARENA.
- difficulty — указывать ТОЛЬКО для CHALLENGE: "BRONZE", "SILVER", или "GOLD". Для остальных типов — null.
- topic — конкретная, узкая тема для каждой карточки (не общее название кампании).
- Количество дней — ровно ${durationDays}.
- 5-8 карточек в день (оптимально 6-7).
- SPARRING и ARENA — системные. Указывай их в расписании, но topic для них — краткое описание (например, "Бой по теме переговоров").`;

  const userPrompt = `Спроектируй структуру кампании.

Название: ${topic}
Ветка знаний: ${BRANCH_RU[branch]} (${BRANCH_DESCRIPTIONS[branch]})
Длительность: ${durationDays} дней
Уровень: ${rankDesc}${description ? `\nОписание: ${description}` : ''}

Распредели карточки по дням с нарастающей сложностью. Каждый день — логически связанный блок.
Сгенерируй структуру:`;

  return { systemPrompt, userPrompt, temperature: 0.7 };
}
