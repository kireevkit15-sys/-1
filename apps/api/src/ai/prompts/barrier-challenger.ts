/**
 * barrier-challenger.ts
 * Промпты и парсеры для всех 4 стадий барьера (испытания) уровня.
 *
 * Recall  — память: ученик пересказывает концепт
 * Connect — связи: ученик объясняет связь между двумя концептами
 * Apply   — применение: ученик решает ситуационную задачу
 * Defend  — защита: AI-оппонент ведёт дебаты, давит, ищет слабые места
 * Summary — итоговый вердикт по всем стадиям
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface Exchange {
  role: 'user' | 'assistant';
  content: string;
}

export interface GradeResult {
  score: number;
  feedback: string;
}

export interface ApplyGradeResult extends GradeResult {
  conceptsApplied: string[];
}

export interface DefendScoreResult extends GradeResult {
  // score 0..1, feedback — итоговый вердикт дебатов
}

export interface StageScore {
  stage: string;
  score: number;
  weight: number;
}

export interface StageResults {
  recall: { avgScore: number; count: number };
  connect: { avgScore: number; count: number };
  apply: { avgScore: number; count: number };
  defend: { score: number; rounds: number };
  totalScore: number;
  passed: boolean;
}

// ── Recall stage ──────────────────────────────────────────────────────

export function buildRecallGraderPrompt(
  conceptName: string,
  conceptDescription: string,
  userAnswer: string,
): string {
  return `Ты — строгий экзаменатор платформы РАЗУМ. Оцени, насколько точно и полно ученик вспомнил концепт.

## Концепт
Название: "${conceptName}"
Описание (эталон): ${conceptDescription}

## Ответ ученика
${userAnswer}

## Критерии оценки (шкала 0.0 — 1.0)

| Балл | Значение |
|------|----------|
| 0.0  | Полностью неверно или пусто — ученик не помнит ничего |
| 0.2  | Смутное воспоминание — есть отдалённая ассоциация, но суть искажена |
| 0.4  | Частичная память — ученик помнит фрагменты, но упускает ключевое |
| 0.6  | Хорошее воспоминание — суть передана верно, но с неточностями |
| 0.8  | Точная память — всё корректно, формулировки осмысленные |
| 1.0  | Безупречно — точно, глубоко, с примером или контекстом |

## Правила
- Это испытание, не тест. Будь требователен: поверхностный пересказ = максимум 0.5.
- Если ученик добавил верные связи или примеры — поощри баллом.
- Если ответ копипаста без осмысления — снижай.
- Обратная связь: 1 предложение, конструктивно, по-русски.

Ответь СТРОГО в формате JSON (без markdown):
{"score": <число от 0 до 1 с шагом 0.1>, "feedback": "<комментарий на русском>"}`;
}

export function parseRecallResponse(response: string): GradeResult {
  return parseGradeJson(response, {
    score: 0.3,
    feedback: 'Не удалось оценить ответ. Попробуй сформулировать точнее.',
  });
}

// ── Connect stage ─────────────────────────────────────────────────────

export function buildConnectGraderPrompt(
  concept1: string,
  concept1Description: string,
  concept2: string,
  concept2Description: string,
  userExplanation: string,
): string {
  return `Ты — строгий экзаменатор платформы РАЗУМ. Оцени, насколько глубоко ученик понимает СВЯЗЬ между двумя концептами.

## Концепт 1
"${concept1}": ${concept1Description}

## Концепт 2
"${concept2}": ${concept2Description}

## Объяснение связи учеником
${userExplanation}

## Критерии оценки (шкала 0.0 — 1.0)

| Балл | Значение |
|------|----------|
| 0.0  | Связь не установлена или полный бред |
| 0.2  | Формальная связь — «оба про философию», без глубины |
| 0.4  | Поверхностная связь — видит общее, но не объясняет механизм |
| 0.6  | Рабочая связь — корректная логика, но без оригинальности |
| 0.8  | Глубокая связь — неочевидные параллели, примеры, причинно-следственные цепочки |
| 1.0  | Мастерская связь — синтез знаний, оригинальный инсайт, выход за рамки очевидного |

## Правила
- Это испытание. Простое «они похожи» = максимум 0.3.
- Цени: причинно-следственные связи, противопоставления, синтез, примеры из жизни.
- Штрафуй: общие слова, подмена понятий, логические ошибки.
- Обратная связь: 1-2 предложения, конструктивно, по-русски.

Ответь СТРОГО в формате JSON (без markdown):
{"score": <число от 0 до 1 с шагом 0.1>, "feedback": "<комментарий на русском>"}`;
}

export function parseConnectResponse(response: string): GradeResult {
  return parseGradeJson(response, {
    score: 0.3,
    feedback: 'Не удалось оценить связь. Попробуй объяснить конкретнее.',
  });
}

// ── Apply stage ───────────────────────────────────────────────────────

export function buildApplyGraderPrompt(
  situation: string,
  concepts: string[],
  userAnswer: string,
): string {
  const conceptList = concepts.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `Ты — строгий экзаменатор платформы РАЗУМ. Оцени, насколько ученик умеет ПРИМЕНЯТЬ знания к реальной ситуации.

## Ситуация
${situation}

## Доступные концепты
${conceptList}

## Ответ ученика
${userAnswer}

## Критерии оценки (шкала 0.0 — 1.0)

| Балл | Значение |
|------|----------|
| 0.0  | Полностью мимо — ответ не относится к ситуации |
| 0.2  | Формальное упоминание концептов без реального применения |
| 0.4  | Поверхностное применение — правильное направление, но без конкретики |
| 0.6  | Рабочее решение — применяет 1-2 концепта корректно, есть план действий |
| 0.8  | Сильное решение — несколько концептов, конкретные шаги, учёт нюансов |
| 1.0  | Мастерское решение — глубокий синтез, нестандартный подход, учёт последствий |

## Правила
- Это испытание. Теория без конкретики = максимум 0.4.
- Цени: конкретные действия, учёт контекста, комбинирование концептов, осознание ограничений.
- Штрафуй: абстрактные рассуждения, игнорирование ситуации, механический пересказ.
- Укажи, какие концепты ученик реально использовал (массив строк).
- Обратная связь: 1-2 предложения, конструктивно, по-русски.

Ответь СТРОГО в формате JSON (без markdown):
{"score": <число от 0 до 1 с шагом 0.1>, "feedback": "<комментарий на русском>", "conceptsApplied": ["название1", "название2"]}`;
}

export function parseApplyResponse(response: string): ApplyGradeResult {
  const fallback: ApplyGradeResult = {
    score: 0.3,
    feedback: 'Не удалось оценить применение. Попробуй дать более конкретный ответ.',
    conceptsApplied: [],
  };

  const json = extractJson(response);
  if (!json) return fallback;

  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return fallback;

    const score = clampScore(parsed['score']);
    const feedback = typeof parsed['feedback'] === 'string' && parsed['feedback'].length > 0
      ? parsed['feedback']
      : fallback.feedback;
    const conceptsApplied = Array.isArray(parsed['conceptsApplied'])
      ? (parsed['conceptsApplied'] as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];

    return { score, feedback, conceptsApplied };
  } catch {
    return fallback;
  }
}

// ── Defend stage ──────────────────────────────────────────────────────

const DEFEND_PRESSURE: Record<number, string> = {
  1: `Раунд 1 из 4 — Мягкое зондирование.
Задай уточняющий вопрос, мягко укажи на возможную слабость позиции.
Тон: уважительный, но скептичный. Цель: заставить ученика развернуть аргументацию.`,

  2: `Раунд 2 из 4 — Нарастающее давление.
Прямо укажи на логическую уязвимость в аргументах ученика. Предложи контрпример.
Тон: настойчивый, с конкретикой. Цель: проверить, умеет ли ученик отвечать на критику.`,

  3: `Раунд 3 из 4 — Жёсткая проверка.
Атакуй самое слабое место. Используй конкретные факты или альтернативные теории.
Тон: жёсткий, но честный. Цель: загнать ученика в угол, где он должен проявить глубину знаний.`,

  4: `Раунд 4 из 4 — Финальный раунд. ПОСЛЕДНИЙ.
Дай последний шанс ученику укрепить позицию. Затем ОБЯЗАТЕЛЬНО подведи итог дебатов.
Признай сильные стороны аргументации, укажи что осталось слабым.

ОБЯЗАТЕЛЬНО в самом конце ответа добавь оценку в формате JSON:
{"score": <число от 0 до 1>, "feedback": "<итоговый вердикт дебатов на русском>"}

Шкала оценки дебатов:
0.0-0.2 = ученик не смог защитить позицию, путался, противоречил себе
0.3-0.4 = слабая защита, аргументы поверхностные
0.5-0.6 = средняя защита, были удачные моменты, но и провалы
0.7-0.8 = сильная защита, уверенные аргументы с примерами
0.9-1.0 = блестящая защита, ученик переубедил оппонента`,
};

export function buildDefendPrompt(
  concept: string,
  level: string,
  conceptsContext: string,
  userMessage: string,
  roundNumber: number,
  previousExchanges: Exchange[],
): string {
  const round = Math.min(Math.max(roundNumber, 1), 4);
  const pressureInstruction = DEFEND_PRESSURE[round] ?? DEFEND_PRESSURE[4];

  const historyBlock = previousExchanges.length > 0
    ? `\n## История дебатов\n${previousExchanges.map((e) => `[${e.role === 'user' ? 'УЧЕНИК' : 'ОППОНЕНТ'}]: ${e.content}`).join('\n')}\n`
    : '';

  return `Ты — оппонент-интеллектуал на испытании платформы РАЗУМ. Твоя роль: скептик, который проверяет глубину понимания ученика через дебаты.

## Контекст
Ученик прошёл уровень "${level}" и теперь защищает свои знания.
Тема дебатов связана с концептом: "${concept}"

## Изученные концепты
${conceptsContext}

## Инструкции для текущего раунда
${pressureInstruction}
${historyBlock}
## Текущее сообщение ученика
${userMessage}

## Общие правила
- Говори по-русски, чётко, без воды.
- НЕ соглашайся легко — ты скептик. Но если аргумент реально сильный — признай это.
- Используй конкретику: примеры, контрпримеры, ссылки на теории.
- Длина ответа: 2-4 предложения (кроме финального раунда, где может быть длиннее).
- НЕ повторяй то, что уже говорил.
- Если ученик уклоняется от ответа — прямо укажи на это.`;
}

export function parseDefendScore(response: string): DefendScoreResult {
  const fallback: DefendScoreResult = {
    score: 0.5,
    feedback: 'Испытание завершено. Результат неоднозначен.',
  };

  // Try to find JSON in the response (it may be embedded in text)
  const json = extractJson(response);
  if (!json) return fallback;

  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return fallback;

    const score = clampScore(parsed['score']);
    const feedback = typeof parsed['feedback'] === 'string' && parsed['feedback'].length > 0
      ? parsed['feedback']
      : fallback.feedback;

    return { score, feedback };
  } catch {
    return fallback;
  }
}

// ── Summary prompt ────────────────────────────────────────────────────

export function buildBarrierSummaryPrompt(stages: StageResults): string {
  const statusLabel = stages.passed ? 'ПРОЙДЕНО' : 'НЕ ПРОЙДЕНО';

  return `Ты — наставник платформы РАЗУМ. Ученик только что прошёл испытание (барьер уровня).

## Результаты испытания: ${statusLabel}

| Стадия    | Балл  | Вес  |
|-----------|-------|------|
| Recall    | ${stages.recall.avgScore.toFixed(2)} (${stages.recall.count} вопросов) | 20% |
| Connect   | ${stages.connect.avgScore.toFixed(2)} (${stages.connect.count} пар) | 25% |
| Apply     | ${stages.apply.avgScore.toFixed(2)} (${stages.apply.count} ситуаций) | 30% |
| Defend    | ${stages.defend.score.toFixed(2)} (${stages.defend.rounds} раундов) | 25% |
| **Итого** | **${stages.totalScore.toFixed(2)}** | 100% |

Порог прохождения: 0.60

## Задача
Напиши краткий итог испытания (3-5 предложений) по-русски:
1. Общая оценка: что ученик делает хорошо, что — плохо.
2. Самая сильная стадия и самая слабая.
3. ${stages.passed ? 'Поздравление + что развивать дальше.' : 'Конкретные рекомендации по подготовке к пересдаче.'}

Тон: ${stages.passed ? 'уважительный, поздравительный, но без лести' : 'строгий, но поддерживающий — ученик должен захотеть пересдать'}.`;
}

// ── Private helpers ───────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value)) return 0.3;
  return Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;
}

/**
 * Извлекает первый JSON-объект из текста (AI часто оборачивает его в markdown).
 */
function extractJson(text: string): string | null {
  // Try direct parse first
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const endIdx = findClosingBrace(trimmed, 0);
    if (endIdx !== -1) return trimmed.slice(0, endIdx + 1);
  }

  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch?.[1]) return codeBlockMatch[1];

  // Try to find any JSON object in text
  const jsonMatch = text.match(/\{[^{}]*"score"[^{}]*\}/);
  if (jsonMatch?.[0]) return jsonMatch[0];

  return null;
}

function findClosingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function parseGradeJson(response: string, fallback: GradeResult): GradeResult {
  const json = extractJson(response);
  if (!json) return fallback;

  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return fallback;

    const score = clampScore(parsed['score']);
    const feedback = typeof parsed['feedback'] === 'string' && parsed['feedback'].length > 0
      ? parsed['feedback']
      : fallback.feedback;

    return { score, feedback };
  } catch {
    return fallback;
  }
}
