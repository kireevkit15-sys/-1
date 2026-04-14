#!/usr/bin/env ts-node

/**
 * L21.2 — Build Knowledge Graph: determine prerequisite order between concepts
 *
 * For each category, sends concepts to AI to determine prerequisite relationships.
 * Writes ConceptRelation records (PREREQUISITE, RELATED, CONTRASTS, DEEPENS, APPLIES_IN).
 *
 * Usage:
 *   npx ts-node scripts/build-knowledge-graph.ts
 *   npx ts-node scripts/build-knowledge-graph.ts --branch STRATEGY
 *   npx ts-node scripts/build-knowledge-graph.ts --dry-run
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

const MODEL = process.env.AI_MODEL_FAST || 'google/gemini-2.5-flash';

interface RelationResult {
  sourceSlug: string;
  targetSlug: string;
  relationType: 'PREREQUISITE' | 'RELATED' | 'CONTRASTS' | 'DEEPENS' | 'APPLIES_IN';
  strength: number;
}

async function determineRelations(
  concepts: Array<{ slug: string; nameRu: string; description: string; category: string }>,
): Promise<RelationResult[]> {
  const conceptList = concepts
    .map((c, i) => `${i + 1}. [${c.slug}] "${c.nameRu}" — ${c.description.slice(0, 100)}`)
    .join('\n');

  const prompt = `Проанализируй список концептов и определи связи между ними.

Концепты:
${conceptList}

Для каждой пары связанных концептов определи тип связи:
- PREREQUISITE: A нужно понять ПЕРЕД B (A → B)
- RELATED: A и B связаны тематически
- CONTRASTS: A и B противоречат друг другу
- DEEPENS: A углубляет понимание B
- APPLIES_IN: A применяется в контексте B

Strength: 0.0-1.0 (насколько сильна связь)

Ответь JSON массивом (только значимые связи, не все пары):
[{"sourceSlug": "slug-a", "targetSlug": "slug-b", "relationType": "PREREQUISITE", "strength": 0.8}]`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content ?? '[]';
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]) as RelationResult[];
  } catch (error) {
    console.error('AI call failed:', (error as Error).message);
    return [];
  }
}

async function main() {
  const program = new Command();
  program
    .option('--branch <branch>', 'Process only this branch')
    .option('--dry-run', 'Show what would be created without writing to DB')
    .option('--batch-size <n>', 'Max concepts per AI call', '15')
    .parse();

  const opts = program.opts();
  const dryRun = opts.dryRun === true;
  const batchSize = parseInt(opts.batchSize as string, 10) || 15;

  // Get all concepts grouped by branch+category
  const whereClause = opts.branch ? { branch: opts.branch as string } : {};
  const concepts = await prisma.concept.findMany({
    where: whereClause as { branch?: string },
    orderBy: [{ branch: 'asc' }, { category: 'asc' }],
    select: { id: true, slug: true, nameRu: true, description: true, branch: true, category: true },
  });

  console.log(`Total concepts: ${concepts.length}`);

  // Group by branch
  const byBranch = new Map<string, typeof concepts>();
  for (const c of concepts) {
    const group = byBranch.get(c.branch) ?? [];
    group.push(c);
    byBranch.set(c.branch, group);
  }

  let totalCreated = 0;

  for (const [branch, branchConcepts] of byBranch) {
    console.log(`\n── ${branch} (${branchConcepts.length} concepts) ──`);

    // Process in batches
    for (let i = 0; i < branchConcepts.length; i += batchSize) {
      const batch = branchConcepts.slice(i, i + batchSize);
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} concepts`);

      const relations = await determineRelations(batch);
      console.log(`  → ${relations.length} relations found`);

      // Create slug→id map
      const slugToId = new Map<string, string>();
      for (const c of batch) slugToId.set(c.slug, c.id);

      for (const rel of relations) {
        const sourceId = slugToId.get(rel.sourceSlug);
        const targetId = slugToId.get(rel.targetSlug);

        if (!sourceId || !targetId) {
          console.log(`  ⚠ Unknown slug: ${rel.sourceSlug} or ${rel.targetSlug}`);
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY] ${rel.sourceSlug} --${rel.relationType}(${rel.strength})--> ${rel.targetSlug}`);
        } else {
          try {
            await prisma.conceptRelation.upsert({
              where: {
                sourceId_targetId_relationType: {
                  sourceId,
                  targetId,
                  relationType: rel.relationType,
                },
              },
              update: { strength: rel.strength },
              create: {
                sourceId,
                targetId,
                relationType: rel.relationType,
                strength: rel.strength,
              },
            });
            totalCreated++;
          } catch (error) {
            console.error(`  ✗ Failed to create relation: ${(error as Error).message}`);
          }
        }
      }

      // Rate limiting — wait 1s between batches
      if (i + batchSize < branchConcepts.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.log(`\n✅ Done! Relations created: ${totalCreated}`);
  console.log(`Total relations in DB: ${await prisma.conceptRelation.count()}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
