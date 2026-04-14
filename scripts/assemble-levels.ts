#!/usr/bin/env ts-node

/**
 * L21.8 — Assemble 3 levels of the main learning thread (15-20 days)
 *
 * Creates a "template" learning path with pre-assigned concepts per day.
 * Level 1 (SLEEPING→AWAKENED): days 1-5, BRONZE concepts
 * Level 2 (AWAKENED→OBSERVER): days 6-10, BRONZE+SILVER concepts
 * Level 3 (OBSERVER→WARRIOR): days 11-15/20, SILVER concepts
 *
 * This creates a "seed" LearningPath for a special template user,
 * which the LearningService uses as a basis for personal paths.
 *
 * Usage:
 *   npx ts-node scripts/assemble-levels.ts
 *   npx ts-node scripts/assemble-levels.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { config } from 'dotenv';
import { Command } from 'commander';

config({ path: resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

interface LevelConfig {
  name: string;
  days: number;
  difficulties: string[];
  branches: string[]; // cycle through branches for variety
}

const LEVELS: LevelConfig[] = [
  {
    name: 'Level 1: Спящий → Пробудившийся',
    days: 5,
    difficulties: ['BRONZE'],
    branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'],
  },
  {
    name: 'Level 2: Пробудившийся → Наблюдатель',
    days: 5,
    difficulties: ['BRONZE', 'SILVER'],
    branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'],
  },
  {
    name: 'Level 3: Наблюдатель → Воин',
    days: 7,
    difficulties: ['SILVER'],
    branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'],
  },
];

function generateDefaultCards(concept: { nameRu: string; description: string }) {
  return [
    { type: 'hook', content: { text: concept.nameRu } },
    { type: 'explanation', content: { text: concept.description } },
    { type: 'evidence', content: { text: '' } },
    { type: 'example', content: { text: '' } },
    { type: 'quiz', content: { question: '', options: [], correctIndex: 0, explanations: [] } },
    { type: 'explain', content: { prompt: `Объясни своими словами: ${concept.nameRu}` } },
    { type: 'thread', content: { yesterday: null, today: concept.nameRu, tomorrow: null } },
    { type: 'wisdom', content: { quote: '', author: '' } },
  ];
}

async function main() {
  const program = new Command();
  program
    .option('--dry-run', 'Show what would be created')
    .parse();

  const dryRun = program.opts().dryRun === true;

  // Get all concepts with their source info
  const allConcepts = await prisma.concept.findMany({
    orderBy: [{ difficulty: 'asc' }, { bloomLevel: 'asc' }, { branch: 'asc' }],
    select: { id: true, slug: true, nameRu: true, description: true, branch: true, difficulty: true },
  });

  console.log(`Total concepts available: ${allConcepts.length}`);

  const usedConceptIds = new Set<string>();
  let currentDay = 0;
  const assembledDays: Array<{
    dayNumber: number;
    level: string;
    concept: { id: string; slug: string; nameRu: string; description: string };
  }> = [];

  for (const level of LEVELS) {
    console.log(`\n── ${level.name} (${level.days} days) ──`);

    for (let d = 0; d < level.days; d++) {
      currentDay++;
      const targetBranch = level.branches[d % level.branches.length]!;

      // Find best concept for this day
      const candidate = allConcepts.find(
        (c) =>
          !usedConceptIds.has(c.id) &&
          c.branch === targetBranch &&
          level.difficulties.includes(c.difficulty),
      );

      // Fallback: any unused concept with right difficulty
      const concept =
        candidate ??
        allConcepts.find(
          (c) => !usedConceptIds.has(c.id) && level.difficulties.includes(c.difficulty),
        );

      if (!concept) {
        console.log(`  Day ${currentDay}: ⚠ No concept available, skipping`);
        continue;
      }

      usedConceptIds.add(concept.id);
      assembledDays.push({
        dayNumber: currentDay,
        level: level.name,
        concept,
      });

      console.log(`  Day ${currentDay}: [${concept.branch}] ${concept.nameRu} (${concept.difficulty})`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`Total days assembled: ${assembledDays.length}`);
  console.log(`Concepts used: ${usedConceptIds.size}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No data written to database.');
    return;
  }

  // Write assembled data to a JSON file for reference
  const outputPath = resolve(__dirname, '..', 'content', 'processed', 'assembled-levels.json');
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  const dir = resolve(__dirname, '..', 'content', 'processed');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(
    outputPath,
    JSON.stringify(
      assembledDays.map((d) => ({
        dayNumber: d.dayNumber,
        level: d.level,
        conceptSlug: d.concept.slug,
        conceptName: d.concept.nameRu,
        branch: (d.concept as { branch?: string }).branch,
      })),
      null,
      2,
    ),
  );

  console.log(`\nAssembled levels saved to: ${outputPath}`);
  console.log('Run generate-daily-cards.ts to fill cards with AI-generated content.');
  console.log(`\n✅ Done!`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
