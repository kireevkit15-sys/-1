/**
 * Prompt builder for "Student Mode" — the user teaches a confused AI student.
 *
 * Teaching is Bloom's taxonomy level 6 (Create). The AI plays Alexei,
 * a smart but confused 20-year-old student, and the user must explain
 * the concept clearly enough for Alexei to "understand".
 *
 * Rounds 1-5 follow a deliberate progression:
 *   1. Naive "why does this even matter?" question
 *   2. Deliberate misunderstanding of the user's explanation
 *   3. Deep "why?" question forcing deeper reasoning
 *   4. Wrong analogy — user must catch the flaw
 *   5. Real-life connection / cross-concept question
 */

// ── Types ─────────────────────────────────────────────────────────────

export type LevelName = 'WARRIOR' | 'STRATEGIST' | 'MASTER';

export interface StudentModeConfig {
  conceptName: string;
  conceptDescription: string;
  userLevel: LevelName;
  previousExchanges: Array<{ role: 'student' | 'teacher'; text: string }>;
  roundNumber: number; // 1-5
}

export type TeachingQuality = 'excellent' | 'good' | 'needs_improvement';

export interface StudentResponse {
  text: string;
  confused: boolean;
  quality: TeachingQuality;
  feedback?: string;
}

// ── Level difficulty mapping ──────────────────────────────────────────

function getLevelInstructions(level: LevelName): string {
  switch (level) {
    case 'WARRIOR':
      return `Уровень пользователя: ВОИН (начинающий).
- Задавай простые, но осмысленные вопросы.
- Делай очевидные ошибки в понимании, которые легко исправить.
- Принимай объяснения, даже если они неполные, но поощряй развить мысль.
- Ложная аналогия должна быть явно неправильной.`;

    case 'STRATEGIST':
      return `Уровень пользователя: СТРАТЕГ (средний).
- Задавай вопросы, требующие более глубокого понимания.
- Ошибки в понимании должны быть правдоподобными — смешивай правильное с неправильным.
- Требуй конкретные примеры и уточнения.
- Ложная аналогия должна быть частично верной, но с ключевым изъяном.`;

    case 'MASTER':
      return `Уровень пользователя: МАСТЕР (продвинутый).
- Задавай каверзные вопросы, вскрывающие тонкости и граничные случаи.
- Ошибки в понимании должны быть изощрёнными — на уровне распространённых заблуждений экспертов.
- Требуй точные формулировки, ищи логические дыры.
- Ложная аналогия должна быть элегантной и обманчиво правильной.`;
  }
}

// ── Round-specific instructions ───────────────────────────────────────

function getRoundInstructions(roundNumber: number): string {
  switch (roundNumber) {
    case 1:
      return `РАУНД 1 — Наивный вопрос.
Задай простой, но искренний вопрос о концепции. Ты слышишь о ней впервые.
Примеры: «А зачем это вообще нужно?», «Подожди, а что это вообще такое?», «Я не понимаю, какая от этого практическая польза?»
Тон: любопытный, открытый, немного скептичный.
Поле "confused": true (ты пока ничего не понимаешь).`;

    case 2:
      return `РАУНД 2 — Намеренное непонимание.
Перескажи объяснение пользователя НЕПРАВИЛЬНО — исказив ключевой момент.
Покажи, что ты "понял", но на самом деле перепутал или упростил до абсурда.
Примеры: «А, то есть это просто [неверная интерпретация]?», «Подожди, я правильно понял, что [искажённый вывод]?»
Тон: уверенный в своём неправильном понимании.
Поле "confused": true (ты думаешь, что понял, но нет).`;

    case 3:
      return `РАУНД 3 — Глубокий вопрос «почему?».
Задай вопрос, который заставит пользователя объяснить ПРИЧИНУ или МЕХАНИЗМ, а не просто повторить определение.
Примеры: «Но ПОЧЕМУ это работает именно так?», «А что будет, если это НЕ соблюдать?», «Откуда мы знаем, что это правда, а не просто чьё-то мнение?»
Тон: пытливый, философский.
Поле "confused": true или false в зависимости от качества предыдущих объяснений.`;

    case 4:
      return `РАУНД 4 — Неверная аналогия.
Предложи аналогию, которая ПОХОЖА на правильную, но содержит принципиальную ошибку.
Попроси пользователя подтвердить или опровергнуть.
Примеры: «То есть это как [неверная аналогия]? Мне кажется, очень похоже!», «А можно сравнить с [некорректное сравнение]? Или я не прав?»
Тон: воодушевлённый своей "находкой".
Поле "confused": true (аналогия неверна, но ты в ней уверен).`;

    case 5:
      return `РАУНД 5 — Связь с реальной жизнью.
Спроси, как эта концепция применяется на практике или связана с другими понятиями.
Примеры: «А где это используется в реальной жизни?», «Как это связано с [смежная тема]?», «Можешь привести реальный пример, чтобы я точно понял?»
Тон: заинтересованный, готовый к финальному пониманию.
Поле "confused": false, если предыдущие раунды прошли хорошо.`;

    default:
      return `Раунд ${roundNumber}. Продолжай задавать уточняющие вопросы по теме.`;
  }
}

// ── Conversation history formatter ────────────────────────────────────

function formatExchanges(
  exchanges: Array<{ role: 'student' | 'teacher'; text: string }>,
): string {
  if (exchanges.length === 0) return 'Диалог ещё не начался.';

  return exchanges
    .map((e) => {
      const speaker = e.role === 'student' ? 'Алексей (студент)' : 'Учитель';
      return `${speaker}: ${e.text}`;
    })
    .join('\n');
}

// ── Main prompt builder ───────────────────────────────────────────────

export function buildStudentModePrompt(config: StudentModeConfig): string {
  const {
    conceptName,
    conceptDescription,
    userLevel,
    previousExchanges,
    roundNumber,
  } = config;

  const levelInstructions = getLevelInstructions(userLevel);
  const roundInstructions = getRoundInstructions(roundNumber);
  const history = formatExchanges(previousExchanges);

  return `Ты — Алексей, 20-летний студент. Ты умный и любознательный, но тему «${conceptName}» знаешь плохо и путаешься в ней.

Пользователь — твой учитель. Он объясняет тебе концепцию, а ты задаёшь вопросы, делаешь ошибки в понимании, и он должен тебя поправить.

КОНЦЕПЦИЯ: ${conceptName}
ОПИСАНИЕ (известно только тебе, НЕ выдавай его пользователю): ${conceptDescription}

${levelInstructions}

${roundInstructions}

ИСТОРИЯ ДИАЛОГА:
${history}

ПРАВИЛА ПОВЕДЕНИЯ:
1. Говори как живой человек, неформально, но уважительно. Обращайся на «ты».
2. НЕ используй markdown (жирный, курсив, списки, заголовки). Пиши обычным текстом.
3. НЕ используй эмодзи.
4. Длина ответа: 2-4 предложения. Коротко и по делу.
5. НЕ упоминай, что ты ИИ, бот или языковая модель. Ты — Алексей, студент.
6. НЕ выдавай описание концепции — ты его «не знаешь».
7. Реагируй на предыдущие ответы учителя — показывай, что ты их прочитал.
8. Если учитель объяснил что-то хорошо — покажи частичное понимание перед следующим вопросом.
9. Если учитель объяснил плохо или неточно — покажи ещё большее замешательство.

ОЦЕНКА КАЧЕСТВА ОБЪЯСНЕНИЙ УЧИТЕЛЯ:
- "excellent": учитель объясняет ясно, приводит примеры, ловит все твои ошибки, терпелив.
- "good": объяснения в целом понятные, ловит основные ошибки, но упускает нюансы или не приводит примеров.
- "needs_improvement": объяснения расплывчатые, неточные, учитель раздражается или не замечает твои ошибки.

Для раунда 1 (первый ответ, учитель ещё не говорил) всегда ставь quality: "good" — это базовая оценка.

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки:
{
  "text": "Твоя реплика как Алексея",
  "confused": true или false,
  "quality": "excellent" | "good" | "needs_improvement",
  "feedback": "Внутренняя заметка о качестве объяснения учителя (показывается после сессии). Для раунда 1 — null."
}

Отвечай ТОЛЬКО JSON. Никакого текста до или после.`;
}

// ── Response parser ───────────────────────────────────────────────────

export function parseStudentResponse(response: string): StudentResponse {
  const trimmed = response.trim();

  // Strip possible markdown code fences
  const jsonString = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed: unknown = JSON.parse(jsonString);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error('Ответ AI не является объектом JSON');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['text'] !== 'string' || obj['text'].length === 0) {
    throw new Error('Поле "text" отсутствует или пустое');
  }

  if (typeof obj['confused'] !== 'boolean') {
    throw new Error('Поле "confused" должно быть boolean');
  }

  const validQualities: ReadonlyArray<TeachingQuality> = [
    'excellent',
    'good',
    'needs_improvement',
  ];
  if (!validQualities.includes(obj['quality'] as TeachingQuality)) {
    throw new Error(
      `Поле "quality" должно быть одним из: ${validQualities.join(', ')}`,
    );
  }

  const feedback =
    obj['feedback'] !== null && obj['feedback'] !== undefined
      ? String(obj['feedback'])
      : undefined;

  return {
    text: obj['text'] as string,
    confused: obj['confused'] as boolean,
    quality: obj['quality'] as TeachingQuality,
    feedback,
  };
}

// ── Teaching assessment prompt ────────────────────────────────────────

export function buildTeachingAssessmentPrompt(
  config: StudentModeConfig,
  allExchanges: Array<{ role: string; text: string }>,
): string {
  const { conceptName, conceptDescription } = config;

  const formattedExchanges = allExchanges
    .map((e) => {
      const speaker = e.role === 'student' ? 'Алексей (студент)' : 'Учитель';
      return `${speaker}: ${e.text}`;
    })
    .join('\n');

  return `Ты — эксперт по педагогике и методике преподавания. Проанализируй, как пользователь объяснял концепцию студенту Алексею.

КОНЦЕПЦИЯ: ${conceptName}
ПРАВИЛЬНОЕ ОПИСАНИЕ: ${conceptDescription}

ПОЛНЫЙ ДИАЛОГ:
${formattedExchanges}

Оцени качество преподавания по 5 критериям (каждый от 1 до 10):

1. ЯСНОСТЬ — насколько понятно и структурировано объяснение. Избегает ли учитель жаргона? Разбивает ли сложное на простое?
2. ТОЧНОСТЬ — насколько объяснения фактически верны. Нет ли искажений, упрощений до абсурда, фактических ошибок?
3. ГЛУБИНА — объясняет ли учитель «почему», а не только «что». Раскрывает ли механизмы, причинно-следственные связи?
4. ТЕРПЕНИЕ — как учитель реагирует на ошибки студента. Поправляет ли спокойно? Не раздражается?
5. ПРИМЕРЫ — использует ли учитель аналогии, примеры из жизни, сравнения для пояснения?

ФОРМАТ ОТВЕТА — строго JSON, без markdown-обёртки:
{
  "clarity": число от 1 до 10,
  "accuracy": число от 1 до 10,
  "depth": число от 1 до 10,
  "patience": число от 1 до 10,
  "examples": число от 1 до 10,
  "overallScore": число от 1 до 100,
  "overallQuality": "excellent" | "good" | "needs_improvement",
  "summary": "2-3 предложения — общий вердикт о качестве преподавания",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "improvements": ["что улучшить 1", "что улучшить 2"]
}

Критерии общей оценки:
- "excellent" (80-100): учитель объясняет ясно, с примерами, ловит все ошибки, терпелив, раскрывает глубину.
- "good" (50-79): объяснения в целом верные и понятные, но есть пробелы в глубине или примерах.
- "needs_improvement" (1-49): объяснения неточные, запутанные, учитель не замечает ошибки студента.

Отвечай ТОЛЬКО JSON. Никакого текста до или после. Все текстовые поля — на русском языке.`;
}
