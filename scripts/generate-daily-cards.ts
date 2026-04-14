#!/usr/bin/env ts-node

/**
 * L21.7 — Generate Daily Cards for the Main Learning Thread
 *
 * For each concept, generates 8 card types:
 * 1. hook — catchy opener
 * 2. explanation — full explanation (2-3 screens)
 * 3. evidence — scientific backing
 * 4. example — real-life story
 * 5. quiz — MCQ with explanations for all options
 * 6. explain — "in your own words" prompt
 * 7. thread — yesterday → today → tomorrow connection
 * 8. wisdom — closing quote
 *
 * Usage:
 *   npx ts-node scripts/generate-daily-cards.ts
 *   npx ts-node scripts/generate-daily-cards.ts --branch STRATEGY --limit 20
 *   npx ts-node scripts/generate-daily-cards.ts --dry-run
 */

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';
import { Command } from 'commander';

config({ path: resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY || '',
  baseURL: process.env.AI_BASE_URL || 'https://api.polza.ai/v1',
});

const MODEL = process.env.AI_MODEL_SMART || 'google/gemini-2.5-flash';

interface ConceptData {
  id: string;
  slug: string;
  nameRu: string;
  description: string;
  branch: string;
  category: string;
}

async function generateCards(
  concept: ConceptData,
  prevConcept: ConceptData | null,
  nextConcept: ConceptData | null,
): Promise<unknown[] | null> {
  const prompt = `Сгенерируй 8 учебных карточек для концепта "${concept.nameRu}".

Описание концепта: ${concept.description}
Ветка: ${concept.branch}
${prevConcept ? `Предыдущий концепт: "${prevConcept.nameRu}"` : ''}
${nextConcept ? `Следующий концепт: "${nextConcept.nameRu}"` : ''}

Голос РАЗУМ — уверенный, мужской, конкретный. Без воды и общих фраз.

Сгенерируй JSON массив из 8 карточек:
[
  {"type": "hook", "content": {"text": "Зацепка — провокационная фраза или вопрос, 1-2 предложения, чтобы зацепить"}},
  {"type": "explanation", "content": {"text": "Полное раскрытие концепта, 3-5 абзацев. Объясни суть, почему это важно, как это работает. Конкретика и примеры."}},
  {"type": "evidence", "content": {"text": "Научное подкрепление: исследование, цифры, факты. 1-2 абзаца."}},
  {"type": "example", "content": {"text": "История из жизни: конкретный пример применения этого концепта. 2-3 абзаца."}},
  {"type": "quiz", "content": {"question": "Вопрос на осмысление", "options": ["вариант A", "вариант B", "вариант C", "вариант D"], "correctIndex": 0, "explanations": ["почему A правильный", "почему B неправильный", "почему C неправильный", "почему D неправильный"]}},
  {"type": "explain", "content": {"prompt": "Объясни своими словами: [конкретный вопрос про концепт]"}},
  {"type": "thread", "content": {"yesterday": "${prevConcept?.nameRu ?? 'null'}", "today": "${concept.nameRu}", "tomorrow": "${nextConcept?.nameRu ?? 'null'}"}},
  {"type": "wisdom", "content": {"quote": "Мудрая цитата, связанная с концептом", "author": "Автор цитаты"}}
]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Ты — генератор учебного контента для мужской платформы РАЗУМ. Отвечай строго JSON массивом из 8 карточек.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.6,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as unknown[];
  } catch (error) {
    console.error(`  ✗ AI failed for ${concept.slug}: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  const program = new Command();
  program
    .option('--branch <branch>', 'Process only this branch')
    .option('--limit <n>', 'Max concepts', '30')
    .option('--dry-run', 'Show what would be generated')
    .parse();

  const opts = program.opts();
  const dryRun = opts.dryRun === true;
  const limit = parseInt(opts.limit as string, 10) || 30;

  const whereClause: Record<string, unknown> = {};
  if (opts.branch) whereClause.branch = opts.branch;

  const concepts = await prisma.concept.findMany({
    where: whereClause,
    orderBy: [{ difficulty: 'asc' }, { bloomLevel: 'asc' }],
    take: limit,
    select: { id: true, slug: true, nameRu: true, description: true, branch: true, category: true },
  });

  console.log(`Processing ${concepts.length} concepts for card generation`);

  let totalUpdated = 0;

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i]!;
    const prev = i > 0 ? concepts[i - 1]! : null;
    const next = i < concepts.length - 1 ? concepts[i + 1]! : null;

    console.log(`  [${i + 1}/${concepts.length}] ${concept.slug}...`);

    if (dryRun) {
      console.log(`  [DRY] Would generate 8 cards for ${concept.slug}`);
      continue;
    }

    const cards = await generateCards(concept, prev, next);
    if (!cards || cards.length === 0) {
      console.log(`  ⚠ No cards generated for ${concept.slug}`);
      continue;
    }

    // Update or create learning day with these cards
    // Find any learning days referencing this concept
    const existingDays = await prisma.learningDay.findMany({
      where: { conceptId: concept.id },
    });

    if (existingDays.length > 0) {
      // Update existing learning days with generated cards
      for (const day of existingDays) {
        await prisma.learningDay.update({
          where: { id: day.id },
          data: { cards: JSON.parse(JSON.stringify(cards)) },
        });
      }
      console.log(`  ✓ Updated ${existingDays.length} learning day(s)`);
    } else {
      console.log(`  ℹ No learning days for ${concept.slug} (cards saved for future use)`);
    }

    totalUpdated++;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n✅ Done! Concepts processed: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
