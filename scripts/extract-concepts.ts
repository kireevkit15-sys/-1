#!/usr/bin/env ts-node

/**
 * BC3 — Extract Concepts from Processed Content
 *
 * Reads segments from content/processed/ (output of BC2),
 * sends each to Claude Haiku for concept extraction,
 * validates and deduplicates results, writes to output.
 *
 * Usage:
 *   npx ts-node scripts/extract-concepts.ts --input content/processed
 *   npx ts-node scripts/extract-concepts.ts --input content/processed/markaryan.json --source "Маркарян"
 *   npx ts-node scripts/extract-concepts.ts --input content/processed --batch-size 3 --verbose
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { Command } from 'commander';

// ── Types ───────────────────────────────────────────────────────────

interface TextSegment {
  id: string;
  content: string;
  source: string;
  sourceFile: string;
  segmentIndex: number;
  totalSegments: number;
  wordCount: number;
  charCount: number;
  overlapWithPrev: number;
  category?: string;
  topic?: string;
  branch?: 'STRATEGY' | 'LOGIC';
}

interface ProcessedFile {
  sourceFile: string;
  sourceName: string;
  format: string;
  segments: TextSegment[];
  processedAt: string;
}

interface ExtractedConcept {
  id: string;
  concept: string;
  source: string;
  claim: string;
  example: string;
  trust_level: 'needs_validation' | 'validated' | 'opinion';
  academic_sources: string[];
  tags: string[];
  branch: 'STRATEGY' | 'LOGIC';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
  potential_questions: string[];
}

interface ExtractionSummary {
  inputFiles: number;
  totalSegments: number;
  processedSegments: number;
  totalConcepts: number;
  validConcepts: number;
  duplicatesRemoved: number;
  byBranch: Record<string, number>;
  byDifficulty: Record<string, number>;
  byTrustLevel: Record<string, number>;
  processingTimeMs: number;
  errors: Array<{ segment: string; error: string }>;
}

// ── Prompt ───────────────────────────────────────────────────────────

function buildPrompt(text: string, source: string): string {
  return `Ты — аналитик контента для интеллектуальной платформы "РАЗУМ" (RPG-батлы знаний для мужчин 25-40 лет).

## Задача
Извлеки ключевые концепты из текста блогера/эксперта. Каждый концепт — это самостоятельная идея, которую можно превратить в вопрос для викторины.

## Источник: ${source}

## Текст для анализа:
${text}

## Формат ответа
Верни ТОЛЬКО JSON-массив без markdown-обёртки. Каждый элемент:
{
  "concept": "Краткое название концепта (3-7 слов)",
  "claim": "Основное утверждение или тезис (1-2 предложения)",
  "example": "Конкретный пример или иллюстрация из текста",
  "trust_level": "validated | needs_validation | opinion",
  "academic_sources": ["Ссылка на научный источник, подтверждающий claim (автор, год, название)"],
  "tags": ["тег1", "тег2", "тег3"],
  "branch": "STRATEGY | LOGIC",
  "difficulty": "BRONZE | SILVER | GOLD",
  "potential_questions": ["Вопрос 1 для викторины", "Вопрос 2"]
}

## Правила
1. trust_level:
   - "validated" — подтверждено исследованиями, общеизвестные факты
   - "needs_validation" — интересное утверждение, но нужна проверка
   - "opinion" — субъективное мнение автора, личный опыт
2. branch:
   - "STRATEGY" — решения, управление, эмоц. интеллект, финансы, здоровье, переговоры, лидерство
   - "LOGIC" — формальная логика, критическое мышление, риторика, вероятности, когнитивные ошибки
3. difficulty:
   - "BRONZE" — базовый концепт, определения, простые факты
   - "SILVER" — требует понимания контекста и анализа
   - "GOLD" — сложный, многоуровневый, синтез нескольких идей
4. academic_sources — 1-3 академических источника. Если нет подходящих — пустой массив []
5. tags — 2-5 коротких тегов на русском для категоризации
6. potential_questions — 2-3 возможных вопроса для викторины на основе концепта
7. Извлекай только ЗНАЧИМЫЕ концепты, не мелкие детали и не пересказ
8. Если текст не содержит значимых концептов — верни пустой массив []
9. Все тексты на русском языке

Верни JSON-массив концептов:`;
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_BRANCHES = ['STRATEGY', 'LOGIC'];
const VALID_DIFFICULTIES = ['BRONZE', 'SILVER', 'GOLD'];
const VALID_TRUST_LEVELS = ['needs_validation', 'validated', 'opinion'];

function isValidConcept(c: unknown): c is Omit<ExtractedConcept, 'id' | 'source'> {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.concept === 'string' && obj.concept.length > 0 &&
    typeof obj.claim === 'string' && obj.claim.length > 0 &&
    typeof obj.example === 'string' &&
    typeof obj.trust_level === 'string' && VALID_TRUST_LEVELS.includes(obj.trust_level) &&
    Array.isArray(obj.tags) && obj.tags.length >= 1 && obj.tags.every((t: unknown) => typeof t === 'string') &&
    typeof obj.branch === 'string' && VALID_BRANCHES.includes(obj.branch) &&
    typeof obj.difficulty === 'string' && VALID_DIFFICULTIES.includes(obj.difficulty) &&
    Array.isArray(obj.potential_questions) &&
    Array.isArray(obj.academic_sources)
  );
}

function parseJsonArray<T>(raw: string): T[] {
  // Try direct parse
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as T[];
    }
  } catch {
    // fallback
  }

  // Regex fallback: extract JSON array
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    return JSON.parse(match[0]) as T[];
  } catch {
    return [];
  }
}

// ── Deduplication ───────────────────────────────────────────────────

function generateConceptId(source: string, concept: string): string {
  const slug = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40);
  return `${slug(source)}-${slug(concept)}`;
}

function deduplicateConcepts(concepts: ExtractedConcept[]): { unique: ExtractedConcept[]; removed: number } {
  const seen = new Map<string, ExtractedConcept>();

  for (const c of concepts) {
    // Normalize key: lowercase concept name
    const key = c.concept.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, c);
    }
  }

  return {
    unique: Array.from(seen.values()),
    removed: concepts.length - seen.size,
  };
}

// ── File loading ────────────────────────────────────────────────────

function loadProcessedFiles(inputPath: string): ProcessedFile[] {
  const absPath = resolve(process.cwd(), inputPath);

  if (!existsSync(absPath)) {
    console.error(`Error: path does not exist: ${absPath}`);
    process.exit(1);
  }

  const stat = statSync(absPath);

  if (stat.isFile()) {
    if (!absPath.endsWith('.json')) {
      console.error('Error: input file must be .json');
      process.exit(1);
    }
    const data = JSON.parse(readFileSync(absPath, 'utf-8')) as ProcessedFile;
    return [data];
  }

  // Directory: load all .json files (excluding summary.json)
  const files = readdirSync(absPath)
    .filter(f => f.endsWith('.json') && f !== 'summary.json')
    .map(f => {
      const data = JSON.parse(readFileSync(join(absPath, f), 'utf-8')) as ProcessedFile;
      return data;
    });

  return files;
}

// ── Main ────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('extract-concepts')
  .description('Extract concepts from processed content segments using Claude Haiku')
  .option('-i, --input <path>', 'Input file or directory (processed JSON)', 'content/processed')
  .option('-o, --output <dir>', 'Output directory', 'scripts/output')
  .option('-s, --source <name>', 'Override source name for all segments')
  .option('--batch-size <n>', 'Segments to process in one API call', '1')
  .option('--max-segments <n>', 'Max segments to process (0 = all)', '0')
  .option('--delay <ms>', 'Delay between API calls in ms', '500')
  .option('--verbose', 'Verbose output', false)
  .option('--dry-run', 'Parse and validate but don\'t call API', false);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const batchSize = parseInt(opts.batchSize, 10);
  const maxSegments = parseInt(opts.maxSegments, 10);
  const delay = parseInt(opts.delay, 10);
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;
  const sourceOverride = opts.source as string | undefined;

  // Load processed files
  const processedFiles = loadProcessedFiles(opts.input);

  if (processedFiles.length === 0) {
    console.warn('No processed files found');
    process.exit(0);
  }

  // Collect all segments
  let allSegments: Array<{ segment: TextSegment; sourceName: string }> = [];
  for (const pf of processedFiles) {
    for (const seg of pf.segments) {
      allSegments.push({
        segment: seg,
        sourceName: sourceOverride ?? pf.sourceName,
      });
    }
  }

  if (maxSegments > 0) {
    allSegments = allSegments.slice(0, maxSegments);
  }

  console.log(`Loaded ${processedFiles.length} file(s), ${allSegments.length} segment(s) to process`);

  if (dryRun) {
    console.log('Dry run — skipping API calls');
    for (const { segment, sourceName } of allSegments) {
      console.log(`  Segment ${segment.segmentIndex + 1}/${segment.totalSegments}: ${segment.wordCount} words (${sourceName})`);
    }
    return;
  }

  // Initialize Anthropic client
  const client = new Anthropic();
  const startTime = Date.now();
  const allConcepts: ExtractedConcept[] = [];
  const errors: Array<{ segment: string; error: string }> = [];
  let processedCount = 0;

  // Process segments
  for (let i = 0; i < allSegments.length; i += batchSize) {
    const batch = allSegments.slice(i, i + batchSize);

    for (const { segment, sourceName } of batch) {
      const label = `[${processedCount + 1}/${allSegments.length}]`;
      const segId = `${sourceName}:seg${segment.segmentIndex}`;

      if (verbose) {
        console.log(`${label} Processing: ${segId} (${segment.wordCount} words)`);
      }

      // Merge batch segments into one text if batchSize > 1
      const text = segment.content;

      try {
        const prompt = buildPrompt(text, sourceName);

        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          console.warn(`${label} Empty response for ${segId}`);
          errors.push({ segment: segId, error: 'Empty response from Claude' });
          processedCount++;
          continue;
        }

        if (verbose) {
          console.log(`${label} Tokens: in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);
        }

        const parsed = parseJsonArray<Record<string, unknown>>(textBlock.text);
        const valid = parsed.filter(isValidConcept);

        // Add id and source, build ExtractedConcept
        const concepts: ExtractedConcept[] = valid.map(c => ({
          id: generateConceptId(sourceName, (c as { concept: string }).concept),
          source: sourceName,
          ...(c as Omit<ExtractedConcept, 'id' | 'source'>),
        }));

        allConcepts.push(...concepts);
        console.log(`${label} ${segId} → ${concepts.length} concept(s) (parsed: ${parsed.length}, valid: ${valid.length})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${label} Error: ${msg}`);
        errors.push({ segment: segId, error: msg });
      }

      processedCount++;
    }

    // Rate limit delay between batches
    if (i + batchSize < allSegments.length && delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Deduplicate
  const { unique, removed } = deduplicateConcepts(allConcepts);

  // Build summary
  const processingTimeMs = Date.now() - startTime;
  const summary: ExtractionSummary = {
    inputFiles: processedFiles.length,
    totalSegments: allSegments.length,
    processedSegments: processedCount,
    totalConcepts: allConcepts.length,
    validConcepts: unique.length,
    duplicatesRemoved: removed,
    byBranch: countBy(unique, 'branch'),
    byDifficulty: countBy(unique, 'difficulty'),
    byTrustLevel: countBy(unique, 'trust_level'),
    processingTimeMs,
    errors,
  };

  // Write output
  const outDir = resolve(process.cwd(), opts.output);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sourceSlug = (sourceOverride ?? 'all')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);

  const conceptsPath = join(outDir, `concepts-${sourceSlug}-${timestamp}.json`);
  writeFileSync(conceptsPath, JSON.stringify(unique, null, 2), 'utf-8');

  const summaryPath = join(outDir, `concepts-${sourceSlug}-${timestamp}-summary.json`);
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  // Print summary
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  Extraction Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  Files:      ${summary.inputFiles}`);
  console.log(`  Segments:   ${summary.processedSegments}/${summary.totalSegments}`);
  console.log(`  Concepts:   ${summary.validConcepts} (${summary.duplicatesRemoved} duplicates removed)`);
  console.log(`  Time:       ${(summary.processingTimeMs / 1000).toFixed(1)}s`);
  console.log('');
  console.log('  By branch:');
  for (const [k, v] of Object.entries(summary.byBranch)) {
    console.log(`    ${k}: ${v}`);
  }
  console.log('  By difficulty:');
  for (const [k, v] of Object.entries(summary.byDifficulty)) {
    console.log(`    ${k}: ${v}`);
  }
  console.log('  By trust level:');
  for (const [k, v] of Object.entries(summary.byTrustLevel)) {
    console.log(`    ${k}: ${v}`);
  }
  if (summary.errors.length > 0) {
    console.log(`\n  Errors: ${summary.errors.length}`);
    for (const e of summary.errors) {
      console.log(`    - ${e.segment}: ${e.error}`);
    }
  }
  console.log('');
  console.log(`  Output:  ${conceptsPath}`);
  console.log(`  Summary: ${summaryPath}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    process.exit(1);
  }
}

function countBy(items: ExtractedConcept[], key: keyof ExtractedConcept): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const val = String(item[key]);
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
