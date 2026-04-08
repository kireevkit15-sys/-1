#!/usr/bin/env ts-node

/**
 * BC6 — Batch Question Generation by Taxonomy
 *
 * Generates questions using the full taxonomy (content/categories/*.json),
 * the structured prompt from question-generator.ts, and anti-duplication
 * by checking existing questions in the database.
 *
 * Usage:
 *   npx tsx scripts/generate-questions.ts --category decision-making --subcategory cognitive-biases --topic anchoring-effect
 *   npx tsx scripts/generate-questions.ts --category decision-making --difficulty SILVER --count 10
 *   npx tsx scripts/generate-questions.ts --all --difficulty BRONZE --count 5
 *   npx tsx scripts/generate-questions.ts --category decision-making --dry-run
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { Command } from 'commander';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '..', '.env') });

// ── Types ───────────────────────────────────────────────────────────

interface TaxonomyTopic {
  id: string;
  nameRu: string;
  questionsTarget: Record<string, number>;
}

interface TaxonomySubcategory {
  id: string;
  nameRu: string;
  topics: TaxonomyTopic[];
}

interface TaxonomyCategory {
  branch: 'STRATEGY' | 'LOGIC';
  category: string;
  categoryRu: string;
  subcategories: TaxonomySubcategory[];
}

interface GeneratedQuestion {
  category: string;
  branch: 'STRATEGY' | 'LOGIC';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  statPrimary: string;
  statSecondary?: string;
}

interface GenerationResult {
  topic: string;
  topicRu: string;
  generated: number;
  valid: number;
  duplicatesSkipped: number;
}

// ── Prompt (from question-generator.ts) ─────────────────────────────

const DIFFICULTY_RULES: Record<string, string> = {
  BRONZE: `Уровень BRONZE (определения и узнавание).
- Проверяет знание базовых определений, терминов, простых концепций.
- Правильный ответ очевиден для человека, знакомого с темой.
- Дистракторы содержат распространённые заблуждения и подмену понятий.`,
  SILVER: `Уровень SILVER (применение и анализ).
- Вопрос описывает конкретную жизненную ситуацию и требует выбрать правильное применение концепции.
- Нужно не просто знать определение, а уметь перенести теорию на практику.
- Дистракторы — правдоподобные, но ошибочные стратегии действия.`,
  GOLD: `Уровень GOLD (синтез и оценка).
- Вопрос требует синтеза нескольких концепций или распознавания нескольких ошибок одновременно.
- Может содержать кейс с неочевидным правильным ответом, где нужна глубокая экспертиза.
- Дистракторы — частично верные утверждения, ловушки для поверхностного мышления.`,
};

const BRANCH_DESC: Record<string, string> = {
  STRATEGY: 'Стратегия — принятие решений, планирование, управление ресурсами, целеполагание, переговоры, лидерство.',
  LOGIC: 'Логика — критическое мышление, когнитивные искажения, аргументация, формальная и неформальная логика, анализ данных.',
  ERUDITION: 'Эрудиция — знания о мире, наука, история, философия, психология, экономика, культура.',
  RHETORIC: 'Риторика — коммуникация, аргументация, переговоры, публичные выступления, сторителлинг, убеждение.',
  INTUITION: 'Интуиция — распознавание паттернов, вероятности, когнитивные искажения, эмоциональный интеллект, быстрое мышление.',
};

function buildPrompt(params: {
  categoryRu: string;
  subcategoryRu: string;
  topicRu: string;
  branch: string;
  difficulty: string;
  count: number;
  existingQuestions: string[];
}): string {
  const { categoryRu, subcategoryRu, topicRu, branch, difficulty, count, existingQuestions } = params;
  const branchRuMap: Record<string, string> = {
    STRATEGY: 'Стратегия',
    LOGIC: 'Логика',
    ERUDITION: 'Эрудиция',
    RHETORIC: 'Риторика',
    INTUITION: 'Интуиция',
  };
  const branchRu = branchRuMap[branch] ?? branch;

  let dedupBlock = '';
  if (existingQuestions.length > 0) {
    const listed = existingQuestions.slice(-30).map((q, i) => `  ${i + 1}. ${q}`).join('\n');
    dedupBlock = `

АНТИДУБЛИКАЦИЯ:
По этой теме уже существуют следующие вопросы. НЕ повторяй их смысл, формулировки и ситуации:
${listed}

Каждый новый вопрос должен раскрывать ДРУГОЙ аспект темы, использовать ДРУГУЮ ситуацию.`;
  }

  return `Ты — эксперт-составитель вопросов для интеллектуальной платформы РАЗУМ.

ТВОЯ ЗАДАЧА: сгенерировать ${count} вопросов для викторины.

ТАКСОНОМИЯ:
- Ветка: ${branchRu} (${BRANCH_DESC[branch]})
- Категория: ${categoryRu}
- Подкатегория: ${subcategoryRu}
- Тема: ${topicRu}

Все вопросы СТРОГО по теме "${topicRu}" в рамках "${subcategoryRu}".

УРОВЕНЬ СЛОЖНОСТИ:
${DIFFICULTY_RULES[difficulty]}

ЦЕЛЕВАЯ АУДИТОРИЯ:
Мужчины 20-35 лет. Ситуации: карьера, отношения, финансы, здоровье, спорт, переговоры, конфликты, самоорганизация.

ТРЕБОВАНИЯ:
1. Практическая ситуация из жизни мужчины (не абстрактная теория, не бизнес-кейсы корпораций)
2. Ровно 4 варианта ответа, только ОДИН правильный
3. Дистракторы правдоподобные, содержат распространённые заблуждения
4. correctIndex от 0 до 3, распределён примерно равномерно
5. explanation — 2-4 предложения со ссылкой на академический источник
6. statPrimary/statSecondary — одно из: "LOGIC", "ERUDITION", "STRATEGY", "RHETORIC", "INTUITION"
${dedupBlock}

ФОРМАТ — строго JSON массив, без markdown:
[
  {
    "category": "${categoryRu}",
    "branch": "${branch}",
    "difficulty": "${difficulty}",
    "text": "Текст вопроса",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Объяснение со ссылкой на источник",
    "statPrimary": "STRATEGY",
    "statSecondary": "LOGIC"
  }
]

Верни ТОЛЬКО JSON массив из ${count} вопросов:`;
}

// ── Taxonomy loading ────────────────────────────────────────────────

function loadTaxonomy(categoriesDir: string): TaxonomyCategory[] {
  const dir = resolve(process.cwd(), categoriesDir);
  if (!existsSync(dir)) {
    console.error(`Error: categories directory not found: ${dir}`);
    process.exit(1);
  }

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as TaxonomyCategory);
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_STATS = ['LOGIC', 'ERUDITION', 'STRATEGY', 'RHETORIC', 'INTUITION'];

function validateQuestion(q: unknown, index: number): GeneratedQuestion | null {
  if (typeof q !== 'object' || q === null) { console.warn(`  Q${index}: not an object`); return null; }
  const obj = q as Record<string, unknown>;

  if (!obj.text || typeof obj.text !== 'string') { console.warn(`  Q${index}: missing text`); return null; }
  if (!Array.isArray(obj.options) || obj.options.length !== 4) { console.warn(`  Q${index}: need 4 options`); return null; }
  if (typeof obj.correctIndex !== 'number' || obj.correctIndex < 0 || obj.correctIndex > 3) { console.warn(`  Q${index}: bad correctIndex`); return null; }
  if (!obj.explanation || typeof obj.explanation !== 'string') { console.warn(`  Q${index}: missing explanation`); return null; }

  const statPrimary = typeof obj.statPrimary === 'string' && VALID_STATS.includes(obj.statPrimary)
    ? obj.statPrimary : 'STRATEGY';
  const statSecondary = typeof obj.statSecondary === 'string' && VALID_STATS.includes(obj.statSecondary)
    ? obj.statSecondary : undefined;

  return {
    category: typeof obj.category === 'string' ? obj.category : '',
    branch: (obj.branch === 'STRATEGY' || obj.branch === 'LOGIC') ? obj.branch : 'STRATEGY',
    difficulty: (['BRONZE', 'SILVER', 'GOLD'].includes(obj.difficulty as string))
      ? obj.difficulty as 'BRONZE' | 'SILVER' | 'GOLD' : 'BRONZE',
    text: obj.text,
    options: obj.options as string[],
    correctIndex: obj.correctIndex,
    explanation: obj.explanation,
    statPrimary,
    statSecondary,
  };
}

// ── Anti-duplication ────────────────────────────────────────────────

async function getExistingQuestions(
  prisma: PrismaClient,
  category: string,
  branch: string,
): Promise<string[]> {
  try {
    const questions = await prisma.question.findMany({
      where: { category, branch: branch as 'STRATEGY' | 'LOGIC', isActive: true },
      select: { text: true },
    });
    return questions.map(q => q.text);
  } catch {
    return [];
  }
}

// ── Main ────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('generate-questions')
  .description('Batch generate questions by taxonomy with anti-duplication')
  .option('--category <id>', 'Category ID from taxonomy (e.g. decision-making)')
  .option('--subcategory <id>', 'Subcategory ID (e.g. cognitive-biases)')
  .option('--topic <id>', 'Topic ID (e.g. anchoring-effect)')
  .option('--branch <STRATEGY|LOGIC>', 'Filter by branch')
  .option('--difficulty <level>', 'Difficulty: BRONZE, SILVER, GOLD (default: all)', 'all')
  .option('--count <n>', 'Questions per topic (overrides taxonomy target)', '0')
  .option('--all', 'Generate for ALL topics in taxonomy', false)
  .option('--delay <ms>', 'Delay between API calls in ms', '1000')
  .option('--taxonomy-dir <dir>', 'Categories directory', 'content/categories')
  .option('--verbose', 'Verbose output', false)
  .option('--dry-run', 'Show what would be generated without calling API', false);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const difficulty = opts.difficulty as string;
  const countOverride = parseInt(opts.count, 10);
  const delayMs = parseInt(opts.delay, 10);
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;
  const generateAll = opts.all as boolean;

  // Load taxonomy
  const taxonomy = loadTaxonomy(opts.taxonomyDir);
  console.log(`Loaded ${taxonomy.length} categories from taxonomy`);

  // Filter categories
  let categories = taxonomy;
  if (opts.category) {
    categories = categories.filter(c => c.category === opts.category);
    if (categories.length === 0) {
      console.error(`Category not found: ${opts.category}`);
      console.error(`Available: ${taxonomy.map(c => c.category).join(', ')}`);
      process.exit(1);
    }
  }
  if (opts.branch) {
    categories = categories.filter(c => c.branch === opts.branch);
  }

  // Build list of topics to generate
  const topics: Array<{
    category: TaxonomyCategory;
    subcategory: TaxonomySubcategory;
    topic: TaxonomyTopic;
    difficulties: string[];
  }> = [];

  for (const cat of categories) {
    const subcats = opts.subcategory
      ? cat.subcategories.filter(s => s.id === opts.subcategory)
      : cat.subcategories;

    for (const sub of subcats) {
      const topicList = opts.topic
        ? sub.topics.filter(t => t.id === opts.topic)
        : sub.topics;

      for (const topic of topicList) {
        const difficulties = difficulty === 'all'
          ? ['BRONZE', 'SILVER', 'GOLD']
          : [difficulty];

        topics.push({ category: cat, subcategory: sub, topic, difficulties });
      }
    }
  }

  if (!generateAll && !opts.category) {
    console.error('Specify --category <id> or --all to generate questions');
    console.error(`Available categories: ${taxonomy.map(c => `${c.category} (${c.branch})`).join(', ')}`);
    process.exit(1);
  }

  console.log(`${topics.length} topic(s) to process\n`);

  if (dryRun) {
    for (const { category, subcategory, topic, difficulties } of topics) {
      for (const diff of difficulties) {
        const count = countOverride > 0 ? countOverride : (topic.questionsTarget[diff] ?? 5);
        console.log(`  [dry-run] ${category.categoryRu} → ${subcategory.nameRu} → ${topic.nameRu} | ${diff} x${count}`);
      }
    }
    console.log(`\nTotal API calls: ${topics.reduce((s, t) => s + t.difficulties.length, 0)}`);
    return;
  }

  // Initialize clients (OpenAI-compatible via Polza.ai → Gemini)
  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://api.polza.ai/v1',
  });
  const model = process.env.AI_MODEL_SMART || 'google/gemini-2.5-flash';
  const prisma = new PrismaClient();

  const startTime = Date.now();
  const allQuestions: GeneratedQuestion[] = [];
  const results: GenerationResult[] = [];
  const errors: Array<{ topic: string; error: string }> = [];
  let apiCalls = 0;

  try {
    for (let i = 0; i < topics.length; i++) {
      const { category, subcategory, topic, difficulties } = topics[i];

      for (const diff of difficulties) {
        const count = countOverride > 0 ? countOverride : (topic.questionsTarget[diff] ?? 5);
        const label = `[${apiCalls + 1}] ${category.categoryRu} → ${subcategory.nameRu} → ${topic.nameRu} (${diff})`;

        console.log(`${label}`);

        try {
          // Get existing questions for anti-duplication
          const existing = await getExistingQuestions(prisma, category.categoryRu, category.branch);

          if (verbose) {
            console.log(`  Existing questions: ${existing.length}`);
          }

          // Build and send prompt
          const prompt = buildPrompt({
            categoryRu: category.categoryRu,
            subcategoryRu: subcategory.nameRu,
            topicRu: topic.nameRu,
            branch: category.branch,
            difficulty: diff,
            count,
            existingQuestions: existing,
          });

          const response = await client.chat.completions.create({
            model,
            max_tokens: 8000,
            messages: [{ role: 'user', content: prompt }],
          });

          apiCalls++;

          const text = response.choices?.[0]?.message?.content ?? '';

          if (verbose && response.usage) {
            console.log(`  Tokens: in=${response.usage.prompt_tokens} out=${response.usage.completion_tokens}`);
          }

          // Parse JSON
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            console.error(`  Failed to parse JSON`);
            errors.push({ topic: `${topic.nameRu} (${diff})`, error: 'No JSON array in response' });
            continue;
          }

          const raw = JSON.parse(jsonMatch[0]) as unknown[];
          const valid: GeneratedQuestion[] = [];

          for (let j = 0; j < raw.length; j++) {
            const q = validateQuestion(raw[j], j);
            if (q) {
              // Ensure correct metadata
              q.category = category.categoryRu;
              q.branch = category.branch;
              q.difficulty = diff as 'BRONZE' | 'SILVER' | 'GOLD';
              valid.push(q);
            }
          }

          // Check for duplicates against existing
          const existingLower = new Set(existing.map(t => t.toLowerCase().trim()));
          const unique = valid.filter(q => !existingLower.has(q.text.toLowerCase().trim()));
          const dupsSkipped = valid.length - unique.length;

          allQuestions.push(...unique);
          results.push({
            topic: topic.id,
            topicRu: topic.nameRu,
            generated: raw.length,
            valid: unique.length,
            duplicatesSkipped: dupsSkipped,
          });

          console.log(`  → ${unique.length} valid (${raw.length} generated, ${dupsSkipped} dups skipped)`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  Error: ${msg}`);
          errors.push({ topic: `${topic.nameRu} (${diff})`, error: msg });
        }

        // Rate limit
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  // Write output
  const outDir = join(process.cwd(), 'scripts', 'output');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const catSlug = (opts.category ?? 'batch').replace(/\s+/g, '_');
  const filename = `questions-${catSlug}-${difficulty}-${timestamp}.json`;
  const outPath = join(outDir, filename);
  writeFileSync(outPath, JSON.stringify(allQuestions, null, 2), 'utf-8');

  const elapsed = Date.now() - startTime;

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  Generation Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  API calls:    ${apiCalls}`);
  console.log(`  Questions:    ${allQuestions.length}`);
  console.log(`  Topics:       ${results.length}`);
  console.log(`  Dups skipped: ${results.reduce((s, r) => s + r.duplicatesSkipped, 0)}`);
  console.log(`  Time:         ${(elapsed / 1000).toFixed(1)}s`);
  if (errors.length > 0) {
    console.log(`  Errors:       ${errors.length}`);
    for (const e of errors) {
      console.log(`    - ${e.topic}: ${e.error}`);
    }
  }
  console.log(`  Output:       ${outPath}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
