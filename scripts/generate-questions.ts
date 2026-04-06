import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface GeneratedQuestion {
  category: string;
  branch: "STRATEGY" | "LOGIC";
  difficulty: "BRONZE" | "SILVER" | "GOLD";
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  statPrimary: string;
  statSecondary?: string;
}

function parseArgs(): { category: string; branch: string; difficulty: string; count: number } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  const category = get("--category") ?? "Принятие решений";
  const branch = get("--branch") ?? "STRATEGY";
  const difficulty = get("--difficulty") ?? "BRONZE";
  const count = parseInt(get("--count") ?? "20", 10);
  return { category, branch, difficulty, count };
}

function buildPrompt(category: string, branch: string, difficulty: string, count: number): string {
  const difficultyDesc: Record<string, string> = {
    BRONZE: "Базовый уровень. Вопрос проверяет знание определений и простых концепций. Правильный ответ очевиден для знающего человека.",
    SILVER: "Средний уровень. Вопрос требует применения концепции к жизненной ситуации. Нужно уметь анализировать.",
    GOLD: "Продвинутый уровень. Вопрос требует синтеза нескольких концепций, распознавания нескольких ошибок одновременно, или нетривиального применения теории.",
  };

  return `Ты — эксперт по ${category} (ветка: ${branch === "STRATEGY" ? "Стратегия" : "Логика"}).
Сгенерируй ${count} вопросов на русском языке для интеллектуальной викторины для мужчин 25-40 лет.

Сложность: ${difficulty} — ${difficultyDesc[difficulty]}

ТЕМАТИКА ВОПРОСОВ:
- Все вопросы должны быть про ЛИЧНОЕ саморазвитие, жизненные ситуации, отношения, карьеру, здоровье, финансы
- НЕ про бизнес-кейсы, НЕ про компании, НЕ про абстрактную теорию
- Каждый вопрос — практическая ситуация из жизни мужчины

ФОРМАТ (строго JSON массив):
[
  {
    "text": "Текст вопроса",
    "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
    "correctIndex": 0,
    "explanation": "Объяснение правильного ответа (2-3 предложения)"
  }
]

ПРАВИЛА:
1. Ровно 4 варианта ответа
2. correctIndex от 0 до 3
3. Только ОДИН правильный ответ
4. Неправильные варианты должны быть правдоподобными
5. Объяснение должно быть содержательным
6. Не повторяй формулировки вопросов
7. Варьируй correctIndex (не всегда один и тот же)
8. Верни ТОЛЬКО JSON массив, без markdown

Сгенерируй ${count} вопросов:`;
}

function validate(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  return questions.filter((q, i) => {
    if (!q.text || typeof q.text !== "string") { console.warn(`Q${i}: missing text`); return false; }
    if (!Array.isArray(q.options) || q.options.length !== 4) { console.warn(`Q${i}: need 4 options`); return false; }
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) { console.warn(`Q${i}: bad correctIndex`); return false; }
    if (!q.explanation) { console.warn(`Q${i}: missing explanation`); return false; }
    return true;
  });
}

async function main() {
  const { category, branch, difficulty, count } = parseArgs();

  console.log(`Generating ${count} questions: ${category} / ${branch} / ${difficulty}`);

  const client = new Anthropic();
  const prompt = buildPrompt(category, branch, difficulty, count);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Failed to parse JSON from response");
    console.error(text);
    process.exit(1);
  }

  const raw = JSON.parse(jsonMatch[0]) as Array<{ text: string; options: string[]; correctIndex: number; explanation: string }>;

  const statPrimary = branch === "STRATEGY" ? "strategyXp" : "logicXp";
  const statSecondary = branch === "STRATEGY" ? "logicXp" : "eruditionXp";

  const questions: GeneratedQuestion[] = raw.map(q => ({
    category,
    branch: branch as "STRATEGY" | "LOGIC",
    difficulty: difficulty as "BRONZE" | "SILVER" | "GOLD",
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    statPrimary,
    statSecondary,
  }));

  const valid = validate(questions);
  console.log(`Valid: ${valid.length}/${questions.length}`);

  const outDir = join(process.cwd(), "scripts", "output");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `questions-${category.replace(/\s+/g, "_")}-${branch}-${difficulty}-${timestamp}.json`;
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(valid, null, 2), "utf-8");
  console.log(`Saved to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
