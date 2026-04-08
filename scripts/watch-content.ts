#!/usr/bin/env ts-node

/**
 * Content Watcher — автономный агент для обработки новых материалов
 *
 * Следит за папкой "материал РАЗУМ" на рабочем столе.
 * При появлении нового PDF/TXT:
 *   1. Парсит и сегментирует текст (process-content pipeline)
 *   2. Извлекает концепты через Polza.ai API
 *   3. Сохраняет результат в content/sources/
 *
 * Запуск:
 *   npx tsx scripts/watch-content.ts
 *   npx tsx scripts/watch-content.ts --watch-dir "C:/path/to/folder"
 *   npx tsx scripts/watch-content.ts --verbose
 */

import chokidar from 'chokidar';
import OpenAI from 'openai';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, basename, extname, join } from 'path';
import { Command } from 'commander';
import { config } from 'dotenv';

// Pipeline modules
import { parsePdf } from './lib/pdf-parser';
import { parseTxt } from './lib/txt-parser';
import { parseFb2 } from './lib/fb2-parser';
import { cleanText } from './lib/text-cleaner';
import { normalizeText } from './lib/text-normalizer';
import { segmentText } from './lib/semantic-segmenter';

config({ path: resolve(__dirname, '..', '.env') });

// ── Types ───────────────────────────────────────────────────────────

interface ExtractedConcept {
  id: string;
  concept: string;
  source: string;
  claim: string;
  example: string;
  trust_level: 'needs_validation' | 'validated' | 'opinion';
  academic_sources: string[];
  tags: string[];
  branch: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
  potential_questions: string[];
}

// ── Concept Extraction Prompt ───────────────────────────────────────

function buildExtractionPrompt(text: string, source: string): string {
  return `Ты — аналитик контента для интеллектуальной платформы "РАЗУМ" (RPG-батлы знаний для мужчин 25-40 лет).

## Задача
Извлеки МАКСИМАЛЬНОЕ количество самых лучших и оригинальных для обучения концептов из текста. Не ограничивай себя — если в тексте 30 ценных идей, извлеки все 30. Приоритет: неочевидные, верифицируемые утверждения с конкретными примерами.

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
  "academic_sources": ["Ссылка на научный источник (автор, год, название)"],
  "tags": ["тег1", "тег2", "тег3"],
  "branch": "STRATEGY | LOGIC | ERUDITION | RHETORIC | INTUITION",
  "difficulty": "BRONZE | SILVER | GOLD",
  "potential_questions": ["Вопрос 1 для викторины", "Вопрос 2"]
}

## Правила
1. trust_level: "validated" — научно подтверждено, "needs_validation" — требует проверки, "opinion" — мнение автора
2. branch: "STRATEGY" — решения, управление, лидерство, финансы, предпринимательство, управление временем / "LOGIC" — формальная логика, критическое мышление, системное мышление, ментальные модели, данные / "ERUDITION" — наука, история, философия, психология, экономика / "RHETORIC" — коммуникация, аргументация, переговоры, сторителлинг, убеждение / "INTUITION" — вероятности, когнитивные искажения, эмоциональный интеллект, паттерны, здоровье
3. difficulty: "BRONZE" — базовый, "SILVER" — анализ, "GOLD" — синтез нескольких идей
4. Извлекай ВСЕ значимые концепты — не ограничивай количество
5. Все тексты на русском языке

Верни JSON-массив:`;
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_BRANCHES = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];
const VALID_DIFFICULTIES = ['BRONZE', 'SILVER', 'GOLD'];
const VALID_TRUST_LEVELS = ['needs_validation', 'validated', 'opinion'];

function isValidConcept(c: unknown): boolean {
  if (typeof c !== 'object' || c === null) return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.concept === 'string' && obj.concept.length > 0 &&
    typeof obj.claim === 'string' && obj.claim.length > 0 &&
    typeof obj.example === 'string' &&
    typeof obj.trust_level === 'string' && VALID_TRUST_LEVELS.includes(obj.trust_level) &&
    Array.isArray(obj.tags) && obj.tags.length >= 1 &&
    typeof obj.branch === 'string' && VALID_BRANCHES.includes(obj.branch) &&
    typeof obj.difficulty === 'string' && VALID_DIFFICULTIES.includes(obj.difficulty) &&
    Array.isArray(obj.potential_questions) &&
    Array.isArray(obj.academic_sources)
  );
}

function parseJsonArray(raw: string): Record<string, unknown>[] {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  } catch { /* fallback */ }

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try { return JSON.parse(match[0]); } catch { return []; }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

// ── Processing State ────────────────────────────────────────────────

const PROCESSED_LOG = resolve(__dirname, '..', 'content', '.processed-files.json');

function loadProcessedFiles(): Set<string> {
  if (!existsSync(PROCESSED_LOG)) return new Set();
  try {
    const data = JSON.parse(readFileSync(PROCESSED_LOG, 'utf-8')) as string[];
    return new Set(data);
  } catch { return new Set(); }
}

function saveProcessedFile(filePath: string): void {
  const processed = loadProcessedFiles();
  processed.add(basename(filePath));
  const dir = resolve(__dirname, '..', 'content');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PROCESSED_LOG, JSON.stringify([...processed], null, 2), 'utf-8');
}

function isAlreadyProcessed(filePath: string): boolean {
  return loadProcessedFiles().has(basename(filePath));
}

// ── File Processing Pipeline ────────────────────────────────────────

async function processFile(
  filePath: string,
  client: OpenAI,
  model: string,
  outputBase: string,
  verbose: boolean,
): Promise<void> {
  const fileName = basename(filePath);
  const ext = extname(filePath).toLowerCase();

  if (!['.pdf', '.txt', '.fb2'].includes(ext)) {
    if (verbose) console.log(`  Пропуск (не PDF/TXT/FB2): ${fileName}`);
    return;
  }

  if (isAlreadyProcessed(filePath)) {
    console.log(`  Уже обработан: ${fileName}`);
    return;
  }

  const sourceName = basename(fileName, ext);
  const slug = slugify(sourceName);
  const startTime = Date.now();

  console.log(`\n🔄 Обработка: ${fileName}`);

  try {
    // Step 1: Parse
    console.log('  📄 Парсинг...');
    const rawDoc = ext === '.pdf'
      ? await parsePdf(filePath)
      : ext === '.fb2'
        ? await parseFb2(filePath)
        : await parseTxt(filePath);

    if (!rawDoc.text || rawDoc.text.length < 100) {
      console.log('  ⚠️  Файл слишком короткий или пустой, пропуск');
      return;
    }

    // Step 2: Normalize + Clean
    const normalizedText = normalizeText(rawDoc.text);
    const cleanedDoc = cleanText({ ...rawDoc, text: normalizedText });
    console.log(`  🧹 Очищено: ${cleanedDoc.text.length} символов`);

    // Step 3: Segment
    const segments = segmentText(cleanedDoc.text, {
      minWords: 200,
      maxWords: 500,
      overlapPercent: 10,
      source: sourceName,
      sourceFile: filePath,
    });
    console.log(`  📊 Сегментов: ${segments.length}`);

    // Step 4: Extract concepts via API
    console.log('  🧠 Извлечение концептов...');
    const allConcepts: ExtractedConcept[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const label = `  [${i + 1}/${segments.length}]`;

      try {
        const prompt = buildExtractionPrompt(seg.content, sourceName);
        const response = await client.chat.completions.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          if (verbose) console.log(`${label} Пустой ответ`);
          continue;
        }

        const parsed = parseJsonArray(content);
        const valid = parsed.filter(isValidConcept);

        const concepts: ExtractedConcept[] = valid.map(c => ({
          id: `${slug}-${slugify((c as { concept: string }).concept)}`,
          source: sourceName,
          ...(c as Omit<ExtractedConcept, 'id' | 'source'>),
        }));

        allConcepts.push(...concepts);

        if (verbose) {
          console.log(`${label} ${concepts.length} концептов`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${label} Ошибка API: ${msg}`);
      }

      // Rate limit
      if (i < segments.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Step 5: Deduplicate
    const seen = new Map<string, ExtractedConcept>();
    for (const c of allConcepts) {
      const key = c.concept.toLowerCase().trim();
      if (!seen.has(key)) seen.set(key, c);
    }
    const uniqueConcepts = [...seen.values()];
    const dupsRemoved = allConcepts.length - uniqueConcepts.length;

    // Step 6: Save output
    const outDir = join(outputBase, slug);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const conceptsPath = join(outDir, 'concepts.json');
    writeFileSync(conceptsPath, JSON.stringify(uniqueConcepts, null, 2), 'utf-8');

    const metaPath = join(outDir, 'meta.json');
    writeFileSync(metaPath, JSON.stringify({
      source: sourceName,
      fileName,
      processedAt: new Date().toISOString(),
      segments: segments.length,
      totalConcepts: allConcepts.length,
      uniqueConcepts: uniqueConcepts.length,
      duplicatesRemoved: dupsRemoved,
      processingTimeMs: Date.now() - startTime,
      byBranch: {
        STRATEGY: uniqueConcepts.filter(c => c.branch === 'STRATEGY').length,
        LOGIC: uniqueConcepts.filter(c => c.branch === 'LOGIC').length,
      },
      byDifficulty: {
        BRONZE: uniqueConcepts.filter(c => c.difficulty === 'BRONZE').length,
        SILVER: uniqueConcepts.filter(c => c.difficulty === 'SILVER').length,
        GOLD: uniqueConcepts.filter(c => c.difficulty === 'GOLD').length,
      },
    }, null, 2), 'utf-8');

    // Mark as processed
    saveProcessedFile(filePath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Готово: ${uniqueConcepts.length} концептов (${dupsRemoved} дубликатов удалено) за ${elapsed}с`);
    console.log(`  📁 Сохранено: ${conceptsPath}`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Ошибка обработки ${fileName}: ${msg}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────

const DEFAULT_WATCH_DIR = 'C:/Users/user/Desktop/материал РАЗУМ';
const DEFAULT_OUTPUT_DIR = 'content/sources/auto';

const program = new Command();

program
  .name('watch-content')
  .description('Автономный агент: следит за папкой и обрабатывает новые материалы')
  .option('-w, --watch-dir <dir>', 'Папка для наблюдения', DEFAULT_WATCH_DIR)
  .option('-o, --output <dir>', 'Куда сохранять результаты', DEFAULT_OUTPUT_DIR)
  .option('--scan-only', 'Обработать существующие файлы и выйти (без наблюдения)', false)
  .option('--verbose', 'Подробный вывод', false);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const watchDir = resolve(opts.watchDir);
  const outputDir = resolve(process.cwd(), opts.output);
  const verbose = opts.verbose as boolean;
  const scanOnly = opts.scanOnly as boolean;

  if (!existsSync(watchDir)) {
    console.error(`❌ Папка не найдена: ${watchDir}`);
    process.exit(1);
  }

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // Initialize API client
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    console.error('❌ AI_API_KEY не найден в .env');
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || 'https://api.polza.ai/v1',
  });
  const model = process.env.AI_MODEL_FAST || 'google/gemini-2.5-flash';

  console.log('═══════════════════════════════════════');
  console.log('  🧠 РАЗУМ — Content Watcher Agent');
  console.log('═══════════════════════════════════════');
  console.log(`  Папка:   ${watchDir}`);
  console.log(`  Выход:   ${outputDir}`);
  console.log(`  Модель:  ${model}`);
  console.log(`  Режим:   ${scanOnly ? 'однократный скан' : 'наблюдение'}`);
  console.log('═══════════════════════════════════════\n');

  // Process existing files first
  const existingFiles = readdirSync(watchDir)
    .filter(f => ['.pdf', '.txt', '.fb2'].includes(extname(f).toLowerCase()))
    .map(f => join(watchDir, f));

  const processed = loadProcessedFiles();
  const newFiles = existingFiles.filter(f => !processed.has(basename(f)));

  if (newFiles.length > 0) {
    console.log(`📂 Найдено ${newFiles.length} новых файлов для обработки\n`);
    for (const file of newFiles) {
      await processFile(file, client, model, outputDir, verbose);
    }
  } else {
    console.log('📂 Новых файлов нет\n');
  }

  if (scanOnly) {
    console.log('\n✅ Скан завершён');
    process.exit(0);
  }

  // Watch for new files
  console.log(`\n👁️  Наблюдение за папкой: ${watchDir}`);
  console.log('   Кидай PDF/TXT файлы — обработка начнётся автоматически\n');

  const queue: string[] = [];
  let processing = false;

  async function processQueue(): Promise<void> {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
      const file = queue.shift()!;
      // Small delay to ensure file is fully written
      await new Promise(r => setTimeout(r, 2000));
      await processFile(file, client, model, outputDir, verbose);
    }

    processing = false;
  }

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 3000,
      pollInterval: 500,
    },
  });

  watcher.on('add', (filePath: string) => {
    const ext = extname(filePath).toLowerCase();
    if (!['.pdf', '.txt', '.fb2'].includes(ext)) return;
    if (isAlreadyProcessed(filePath)) return;

    console.log(`\n📥 Новый файл: ${basename(filePath)}`);
    queue.push(filePath);
    processQueue();
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Watcher остановлен');
    watcher.close();
    process.exit(0);
  });
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
