/**
 * L21.1 — Seed all concepts from content/sources/ into Concept table
 *
 * Usage: npx ts-node scripts/seed-concepts.ts
 */

import { PrismaClient, Branch, Difficulty } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RawConcept {
  id: string;
  concept: string;
  source: string;
  claim: string;
  example: string;
  trust_level: string;
  academic_sources?: string[];
  tags: string[];
  branch: string;
  difficulty: string;
  potential_questions?: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      };
      return map[ch] ?? ch;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function inferCategory(tags: string[], branch: string): string {
  const tagStr = tags.join(' ').toLowerCase();

  const categoryMap: Record<string, Record<string, string[]>> = {
    STRATEGY: {
      'decision-making': ['решение', 'выбор', 'принятие решений', 'decision', 'risk'],
      'leadership': ['лидер', 'управлени', 'руководств', 'leader', 'power', 'власт'],
      'entrepreneurship': ['бизнес', 'предприниматель', 'стартап', 'деньги', 'business'],
      'time-management': ['время', 'продуктивност', 'прокрастин', 'time'],
      'financial-literacy': ['финанс', 'инвести', 'капитал', 'finance'],
    },
    LOGIC: {
      'critical-thinking': ['критическ', 'логическ', 'ошибк', 'заблуждени', 'bias', 'fallacy'],
      'systems-thinking': ['систем', 'сложност', 'system', 'complexity'],
      'mental-models': ['модел', 'фреймворк', 'model', 'framework'],
      'formal-logic': ['логик', 'аргумент', 'logic', 'argument'],
      'data-literacy': ['данн', 'статистик', 'data', 'statistic'],
    },
    ERUDITION: {
      'psychology': ['психолог', 'когнитив', 'эмоци', 'самооценк', 'psychology', 'cognitive'],
      'philosophy-ethics': ['философ', 'этик', 'мораль', 'philosophy', 'ethics'],
      'science-literacy': ['наук', 'исследован', 'нейро', 'science', 'neuro'],
      'history-patterns': ['истор', 'цивилиз', 'history'],
      'economics': ['экономик', 'рынок', 'economics'],
    },
    RHETORIC: {
      'communication': ['коммуникац', 'общени', 'communication'],
      'negotiation-relationships': ['переговор', 'отношени', 'конфликт', 'negotiation'],
      'argumentation': ['аргумент', 'дебат', 'argumentation'],
      'storytelling': ['истори', 'нарратив', 'рассказ', 'story', 'narrative'],
      'rhetoric': ['риторик', 'убеждени', 'речь', 'rhetoric', 'persuasion'],
    },
    INTUITION: {
      'pattern-recognition': ['паттерн', 'распознавани', 'pattern'],
      'creativity': ['креатив', 'творчеств', 'creative'],
      'emotional-intelligence': ['эмоциональн', 'эмпати', 'emotional'],
      'meditation-awareness': ['медитац', 'осознанност', 'meditation', 'awareness'],
      'intuition-heuristics': ['интуиц', 'эвристик', 'intuition', 'heuristic'],
    },
  };

  const branchCategories = categoryMap[branch];
  if (!branchCategories) return 'general';

  for (const [category, keywords] of Object.entries(branchCategories)) {
    if (keywords.some((kw) => tagStr.includes(kw))) {
      return category;
    }
  }

  // Default categories per branch
  const defaults: Record<string, string> = {
    STRATEGY: 'decision-making',
    LOGIC: 'critical-thinking',
    ERUDITION: 'psychology',
    RHETORIC: 'communication',
    INTUITION: 'pattern-recognition',
  };

  return defaults[branch] ?? 'general';
}

function inferBloomLevel(difficulty: string, trustLevel: string): number {
  // Bloom's: 1=Remember, 2=Understand, 3=Apply, 4=Analyze, 5=Evaluate, 6=Create
  if (difficulty === 'GOLD') return trustLevel === 'validated' ? 4 : 3;
  if (difficulty === 'SILVER') return 2;
  return 1;
}

async function main() {
  const sourcesDir = path.join(__dirname, '..', 'content', 'sources');
  const conceptFiles: string[] = [];

  // Recursively find all concepts.json
  function findConceptFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findConceptFiles(fullPath);
      } else if (entry.name === 'concepts.json') {
        conceptFiles.push(fullPath);
      }
    }
  }

  findConceptFiles(sourcesDir);
  console.log(`Found ${conceptFiles.length} concept files`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const file of conceptFiles) {
    const relPath = path.relative(path.join(__dirname, '..'), file);
    const raw: RawConcept[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log(`\nProcessing ${relPath}: ${raw.length} concepts`);

    for (const item of raw) {
      const slug = item.id || slugify(item.concept);
      const branch = item.branch as Branch;
      const difficulty = (item.difficulty as Difficulty) || 'BRONZE';

      // Check if already exists
      const existing = await prisma.concept.findUnique({ where: { slug } });
      if (existing) {
        totalSkipped++;
        continue;
      }

      const category = inferCategory(item.tags, item.branch);
      const bloomLevel = inferBloomLevel(item.difficulty, item.trust_level);

      await prisma.concept.create({
        data: {
          slug,
          nameRu: item.concept,
          description: item.claim,
          branch,
          category,
          subcategory: item.tags[0] ?? null,
          bloomLevel,
          difficulty,
          sourceFile: relPath,
        },
      });

      totalCreated++;
    }
  }

  console.log(`\n✅ Done! Created: ${totalCreated}, Skipped (duplicates): ${totalSkipped}`);
  console.log(`Total concepts in DB: ${await prisma.concept.count()}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
