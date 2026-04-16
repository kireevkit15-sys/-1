// ── Промпт для оценки объяснения концепта учеником ──────────────────────────

export interface ExplainGraderInput {
  conceptName: string;
  conceptDescription: string;
  userExplanation: string;
  deliveryStyle?: string;
  bloomLevel?: number;
}

export interface ExplainGraderOutput {
  verdict: 'understood' | 'partial' | 'missed';
  score: number; // 0–1
  feedback: string; // Русский, 1–2 предложения
  missedPoints: string[]; // Что ученик не упомянул
  strengths: string[]; // Что ученик уловил верно
}

const BLOOM_EXPECTATIONS: Record<number, string> = {
  1: 'Уровень «Запоминание»: достаточно воспроизвести ключевые факты и определения.',
  2: 'Уровень «Понимание»: ученик должен объяснить суть своими словами, перефразировать.',
  3: 'Уровень «Применение»: ученик должен показать, как концепт работает на практике, привести пример.',
  4: 'Уровень «Анализ»: ученик должен разложить концепт на составляющие, выявить связи и причины.',
  5: 'Уровень «Оценка»: ученик должен критически оценить концепт, сравнить с альтернативами, аргументировать позицию.',
  6: 'Уровень «Создание»: ученик должен синтезировать новое понимание, предложить собственную модель или решение.',
};

const STYLE_CRITERIA: Record<string, string> = {
  analytical:
    'Ученик с аналитическим стилем. Оценивай логическую структуру объяснения: есть ли чёткая цепочка рассуждений, причинно-следственные связи, системность.',
  practical:
    'Ученик с практическим стилем. Оценивай умение применять: есть ли конкретные примеры, сценарии использования, связь с реальной жизнью.',
  philosophical:
    'Ученик с философским стилем. Оценивай глубину осмысления: есть ли рефлексия, понимание смысла и контекста, связь с более широкими идеями.',
};

const FEW_SHOT_EXAMPLES = `
Пример 1:
Концепт: «Когнитивный диссонанс»
Описание: Состояние дискомфорта при столкновении двух противоречивых убеждений, которое мотивирует человека устранить противоречие.
Объяснение ученика: «Это когда ты думаешь одно, а делаешь другое, и тебе от этого хреново. Например куришь, хотя знаешь что вредно. И мозг начинает искать оправдания типа "мой дед курил до 90 лет".»
Ответ:
{
  "verdict": "understood",
  "score": 0.85,
  "feedback": "Отлично схватил суть — и противоречие, и механизм рационализации. Можно ещё добавить, что диссонанс — это именно мотивация к изменению, а не просто дискомфорт.",
  "missedPoints": ["Диссонанс как движущая сила изменения поведения или убеждений"],
  "strengths": ["Верно описал противоречие между знанием и действием", "Привёл точный пример с рационализацией"]
}

Пример 2:
Концепт: «Принцип Парето (80/20)»
Описание: Эмпирическое правило: примерно 80% результатов обеспечиваются 20% усилий. Применимо к бизнесу, продуктивности, распределению ресурсов.
Объяснение ученика: «Ну это типа 80 на 20, что-то про эффективность.»
Ответ:
{
  "verdict": "missed",
  "score": 0.15,
  "feedback": "Ты запомнил числа, но суть пока не раскрыл. Попробуй подумать: что именно значит, что 20% усилий дают 80% результата? Как это меняет подход к работе?",
  "missedPoints": ["Неравномерность распределения усилий и результатов", "Практическое применение — фокус на ключевых 20%", "Эмпирическая природа правила"],
  "strengths": ["Запомнил соотношение 80/20"]
}

Пример 3:
Концепт: «Стоицизм»
Описание: Философская школа, учащая различать то, что в нашей власти (мысли, реакции), и то, что вне контроля (внешние события). Цель — невозмутимость через принятие.
Объяснение ученика: «Стоицизм — это про разделение на то, что ты контролируешь и что нет. Типа погоду не изменишь, но свою реакцию на неё — да. Марк Аврелий этим жил.»
Ответ:
{
  "verdict": "understood",
  "score": 0.78,
  "feedback": "Ты верно ухватил центральную идею — дихотомию контроля. Упомянул Марка Аврелия, что показывает знание контекста. Для полноты можно раскрыть, к чему ведёт такое разделение — к невозмутимости (атараксии).",
  "missedPoints": ["Цель стоицизма — невозмутимость / атараксия", "Практики: преднамеренный дискомфорт, вечерняя рефлексия"],
  "strengths": ["Дихотомия контроля", "Пример с погодой и реакцией", "Упоминание Марка Аврелия"]
}`;

export function buildExplainGraderPrompt(input: ExplainGraderInput): string {
  const bloomInstruction = input.bloomLevel
    ? (BLOOM_EXPECTATIONS[input.bloomLevel] ??
      BLOOM_EXPECTATIONS[2] ??
      '')
    : (BLOOM_EXPECTATIONS[2] ?? '');

  const styleInstruction = input.deliveryStyle
    ? (STYLE_CRITERIA[input.deliveryStyle] ?? '')
    : '';

  return `Ты — наставник платформы РАЗУМ. Твоя задача — оценить, насколько глубоко ученик понял концепт.

ВАЖНО: Оценивай ПОНИМАНИЕ сути, а не совпадение ключевых слов. Ученик может объяснить правильно совершенно другими словами — это даже лучше, чем цитирование определения. Ищи:
- Уловил ли ученик СУТЬ концепта (центральную идею)?
- Может ли он ОБЪЯСНИТЬ, а не просто повторить?
- Видит ли СВЯЗИ с реальностью или другими идеями?

${bloomInstruction}
${styleInstruction ? '\n' + styleInstruction + '\n' : ''}
Концепт: «${input.conceptName}»
Описание концепта: ${input.conceptDescription}

Правила оценки:
- "understood" (score 0.7–1.0) — ученик уловил суть, объяснил своими словами, возможно привёл пример
- "partial" (score 0.3–0.69) — частично понял, но упустил важные аспекты или поверхностен
- "missed" (score 0.0–0.29) — не понял суть, ответил не по теме или слишком расплывчато

Формат ответа — строго JSON (без markdown-обёртки):
{
  "verdict": "understood" | "partial" | "missed",
  "score": число от 0 до 1,
  "feedback": "1–2 предложения на русском, обращение на «ты», тон — поддерживающий, но честный",
  "missedPoints": ["что ученик не упомянул или не раскрыл"],
  "strengths": ["что ученик уловил верно"]
}

Примеры оценок для калибровки:
${FEW_SHOT_EXAMPLES}

Теперь оцени объяснение ученика.`;
}

export function parseExplainGraderResponse(response: string): ExplainGraderOutput {
  // Попробовать извлечь JSON из ответа
  let jsonString = response.trim();

  // Убрать markdown code block если есть
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    jsonString = codeBlockMatch[1].trim();
  }

  // Попробовать найти JSON-объект в тексте
  if (!jsonString.startsWith('{')) {
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      jsonString = jsonMatch[0];
    }
  }

  try {
    const raw: unknown = JSON.parse(jsonString);

    if (typeof raw !== 'object' || raw === null) {
      return fallback();
    }

    const obj = raw as Record<string, unknown>;

    // Маппинг verdict (поддерживаем старый формат grade тоже)
    const rawVerdict = (obj.verdict ?? obj.grade) as string | undefined;
    const verdict = normalizeVerdict(rawVerdict);

    // Score
    const rawScore = typeof obj.score === 'number' ? obj.score : undefined;
    const score = rawScore !== undefined
      ? Math.max(0, Math.min(1, rawScore))
      : verdictToScore(verdict);

    // Feedback
    const feedback = typeof obj.feedback === 'string' && obj.feedback.length > 0
      ? obj.feedback
      : 'Не удалось сформировать подробный комментарий.';

    // missedPoints
    const missedPoints = Array.isArray(obj.missedPoints)
      ? (obj.missedPoints as unknown[]).filter((x): x is string => typeof x === 'string')
      : Array.isArray(obj.hints)
        ? (obj.hints as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];

    // strengths
    const strengths = Array.isArray(obj.strengths)
      ? (obj.strengths as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];

    return { verdict, score, feedback, missedPoints, strengths };
  } catch {
    return fallback();
  }
}

function normalizeVerdict(value: string | undefined): ExplainGraderOutput['verdict'] {
  if (value === 'understood') return 'understood';
  if (value === 'missed') return 'missed';
  return 'partial';
}

function verdictToScore(verdict: ExplainGraderOutput['verdict']): number {
  if (verdict === 'understood') return 0.8;
  if (verdict === 'missed') return 0.15;
  return 0.45;
}

function fallback(): ExplainGraderOutput {
  return {
    verdict: 'partial',
    score: 0.45,
    feedback: 'Не удалось оценить ответ автоматически. Попробуй объяснить ещё раз подробнее.',
    missedPoints: [],
    strengths: [],
  };
}
