#!/usr/bin/env ts-node

/**
 * L21.3-L21.6 — Generate Depth Layers for Concepts
 *
 * For each concept, generates depth layers via AI:
 * - SCIENCE: scientific research backing the concept
 * - BOOK: related books/ideas with key insights
 * - PHILOSOPHY: philosophical/historical context
 * - CONTRADICTION: opposing viewpoints between concepts
 * - ALTERNATIVE: same concept through different author/metaphor
 * - CONNECTIONS: web of related concepts
 *
 * Usage:
 *   npx ts-node scripts/generate-depth-layers.ts
 *   npx ts-node scripts/generate-depth-layers.ts --layer SCIENCE
 *   npx ts-node scripts/generate-depth-layers.ts --branch STRATEGY --limit 20
 *   npx ts-node scripts/generate-depth-layers.ts --dry-run
 */

import OpenAI from 'openai';
import { PrismaClient, DepthLayerType } from '@prisma/client';
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

interface ConceptForLayer {
  id: string;
  slug: string;
  nameRu: string;
  description: string;
  branch: string;
  category: string;
}

const LAYER_PROMPTS: Record<string, (c: ConceptForLayer) => string> = {
  SCIENCE: (c) => `Концепт: "${c.nameRu}"
Описание: ${c.description}

Найди 2-5 научных подкреплений этого концепта (исследования, эксперименты, статистика).
Перепиши голосом платформы РАЗУМ — уверенный, мужской, без воды.

JSON:
{
  "title": "Наука за этим",
  "findings": [
    {"study": "название исследования", "year": 2020, "finding": "что обнаружили", "implication": "что это значит для практики"}
  ],
  "summary": "краткий вывод 1-2 предложения"
}`,

  BOOK: (c) => `Концепт: "${c.nameRu}"
Описание: ${c.description}

Найди 1-3 книги/идеи, связанные с этим концептом. Ключевая мысль из каждой, переписанная голосом РАЗУМ.

JSON:
{
  "title": "Что читать",
  "books": [
    {"title": "название книги", "author": "автор", "year": 2020, "keyIdea": "ключевая мысль, связанная с концептом", "whyMatters": "почему это важно"}
  ]
}`,

  PHILOSOPHY: (c) => `Концепт: "${c.nameRu}"
Описание: ${c.description}

Найди философский или исторический контекст этого концепта. Откуда пришла идея? Кто думал так же 2000 лет назад?
Перепиши голосом РАЗУМ.

JSON:
{
  "title": "Глубокие корни",
  "context": "философский/исторический контекст (2-3 абзаца)",
  "thinkers": [
    {"name": "имя мыслителя", "era": "эпоха", "connection": "как связан с концептом"}
  ],
  "quote": {"text": "цитата", "author": "автор"}
}`,

  ALTERNATIVE: (c) => `Концепт: "${c.nameRu}"
Описание: ${c.description}

Объясни тот же концепт через другого автора или метафору. Другой угол зрения.
Голос РАЗУМ.

JSON:
{
  "title": "Другой угол",
  "alternativeView": "объяснение через другую призму (2-3 абзаца)",
  "metaphor": "метафора для этого концепта",
  "author": "кто ещё об этом говорил"
}`,
};

async function generateLayer(
  concept: ConceptForLayer,
  layerType: string,
): Promise<Record<string, unknown> | null> {
  const promptFn = LAYER_PROMPTS[layerType];
  if (!promptFn) return null;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Ты — генератор контента для платформы РАЗУМ. Отвечай строго JSON. Голос: уверенный, мужской, без воды, с конкретикой.',
        },
        { role: 'user', content: promptFn(concept) },
      ],
      max_tokens: 1024,
      temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch (error) {
    console.error(`  ✗ AI failed for ${concept.slug}/${layerType}: ${(error as Error).message}`);
    return null;
  }
}

async function findContradictions(
  concepts: ConceptForLayer[],
): Promise<Array<{ conceptA: string; conceptB: string; content: Record<string, unknown> }>> {
  const list = concepts.map((c) => `[${c.slug}] "${c.nameRu}" — ${c.description.slice(0, 80)}`).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: `Проанализируй концепты и найди пары с противоречиями:

${list}

Для каждой пары с реальным противоречием:
JSON массив:
[{
  "slugA": "slug-1",
  "slugB": "slug-2",
  "contradiction": "в чём противоречие (2-3 предложения)",
  "question": "кто прав? вопрос для размышления",
  "resolution": "возможное примирение позиций"
}]

Только реальные противоречия, не все пары.`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content ?? '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const pairs = JSON.parse(jsonMatch[0]) as Array<{
      slugA: string; slugB: string; contradiction: string; question: string; resolution: string;
    }>;

    return pairs.map((p) => ({
      conceptA: p.slugA,
      conceptB: p.slugB,
      content: {
        title: 'Противоречие',
        contradiction: p.contradiction,
        question: p.question,
        resolution: p.resolution,
      },
    }));
  } catch (error) {
    console.error(`Contradictions AI failed: ${(error as Error).message}`);
    return [];
  }
}

async function main() {
  const program = new Command();
  program
    .option('--layer <type>', 'Generate only this layer type (SCIENCE, BOOK, PHILOSOPHY, ALTERNATIVE, CONTRADICTION)')
    .option('--branch <branch>', 'Process only this branch')
    .option('--limit <n>', 'Max concepts to process', '50')
    .option('--dry-run', 'Show what would be created')
    .parse();

  const opts = program.opts();
  const dryRun = opts.dryRun === true;
  const limit = parseInt(opts.limit as string, 10) || 50;
  const layerFilter = opts.layer as string | undefined;

  const whereClause: Record<string, unknown> = {};
  if (opts.branch) whereClause.branch = opts.branch;

  const concepts = await prisma.concept.findMany({
    where: whereClause,
    orderBy: [{ difficulty: 'asc' }, { bloomLevel: 'asc' }],
    take: limit,
    select: { id: true, slug: true, nameRu: true, description: true, branch: true, category: true },
  });

  console.log(`Processing ${concepts.length} concepts`);

  const layerTypes = layerFilter
    ? [layerFilter]
    : ['SCIENCE', 'BOOK', 'PHILOSOPHY', 'ALTERNATIVE'];

  let totalCreated = 0;

  // Individual layers per concept
  for (const layerType of layerTypes) {
    console.log(`\n── Layer: ${layerType} ──`);

    for (const concept of concepts) {
      // Check if already exists
      const existing = await prisma.depthLayer.findUnique({
        where: { conceptId_layerType: { conceptId: concept.id, layerType: layerType as DepthLayerType } },
      });

      if (existing) {
        continue;
      }

      console.log(`  ${concept.slug} → ${layerType}...`);

      if (dryRun) {
        console.log(`  [DRY] Would generate ${layerType} for ${concept.slug}`);
        continue;
      }

      const content = await generateLayer(concept, layerType);
      if (!content) continue;

      await prisma.depthLayer.create({
        data: {
          conceptId: concept.id,
          layerType: layerType as DepthLayerType,
          content: JSON.parse(JSON.stringify(content)),
          sourceRef: `AI generated (${MODEL})`,
        },
      });

      totalCreated++;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // L21.6: Contradictions (if not filtered to specific layer or explicitly requested)
  if (!layerFilter || layerFilter === 'CONTRADICTION') {
    console.log('\n── Contradictions ──');

    // Process by branch in batches of 15
    const byBranch = new Map<string, typeof concepts>();
    for (const c of concepts) {
      const group = byBranch.get(c.branch) ?? [];
      group.push(c);
      byBranch.set(c.branch, group);
    }

    for (const [branch, branchConcepts] of byBranch) {
      console.log(`  Branch ${branch}: ${branchConcepts.length} concepts`);

      const contradictions = await findContradictions(branchConcepts.slice(0, 15));
      console.log(`  → ${contradictions.length} contradictions found`);

      for (const contra of contradictions) {
        const conceptA = concepts.find((c) => c.slug === contra.conceptA);
        if (!conceptA) continue;

        if (dryRun) {
          console.log(`  [DRY] ${contra.conceptA} ↔ ${contra.conceptB}`);
          continue;
        }

        // Check existing
        const existing = await prisma.depthLayer.findUnique({
          where: { conceptId_layerType: { conceptId: conceptA.id, layerType: 'CONTRADICTION' } },
        });

        if (!existing) {
          await prisma.depthLayer.create({
            data: {
              conceptId: conceptA.id,
              layerType: 'CONTRADICTION',
              content: JSON.parse(JSON.stringify(contra.content)),
              sourceRef: `Contradiction with ${contra.conceptB}`,
            },
          });
          totalCreated++;
        }
      }
    }
  }

  console.log(`\n✅ Done! Layers created: ${totalCreated}`);
  console.log(`Total depth layers in DB: ${await prisma.depthLayer.count()}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
