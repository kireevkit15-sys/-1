#!/usr/bin/env ts-node

/**
 * BC4 — Embed Content into pgvector
 *
 * Reads extracted concepts (output of BC3) or processed segments (output of BC2),
 * generates embeddings via OpenAI text-embedding-3-small (1536 dims),
 * and writes them into the knowledge_chunks table with pgvector.
 *
 * Usage:
 *   npx tsx scripts/embed-content.ts --input scripts/output/concepts-*.json
 *   npx tsx scripts/embed-content.ts --input content/processed --mode segments
 *   npx tsx scripts/embed-content.ts --input scripts/output/concepts.json --batch-size 50 --verbose
 */

import OpenAI from 'openai';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load .env from project root
config({ path: resolve(__dirname, '..', '.env') });

// ── Types ───────────────────────────────────────────────────────────

interface ExtractedConcept {
  id: string;
  concept: string;
  source: string;
  claim: string;
  example: string;
  trust_level: string;
  academic_sources: string[];
  tags: string[];
  branch: 'STRATEGY' | 'LOGIC';
  difficulty: 'BRONZE' | 'SILVER' | 'GOLD';
  potential_questions: string[];
}

interface TextSegment {
  id: string;
  content: string;
  source: string;
  sourceFile: string;
  segmentIndex: number;
  totalSegments: number;
  wordCount: number;
  category?: string;
  topic?: string;
  branch?: 'STRATEGY' | 'LOGIC';
}

interface ProcessedFile {
  sourceFile: string;
  sourceName: string;
  segments: TextSegment[];
}

interface ChunkToEmbed {
  content: string;
  source: string;
  category: string;
  topic: string;
  branch: 'STRATEGY' | 'LOGIC';
  metadata: Record<string, unknown>;
}

// ── Loading ─────────────────────────────────────────────────────────

function loadConceptFiles(inputPath: string): ExtractedConcept[] {
  const absPath = resolve(process.cwd(), inputPath);

  if (!existsSync(absPath)) {
    console.error(`Error: path does not exist: ${absPath}`);
    process.exit(1);
  }

  const stat = statSync(absPath);

  if (stat.isFile()) {
    return JSON.parse(readFileSync(absPath, 'utf-8')) as ExtractedConcept[];
  }

  // Directory: load all concepts-*.json files (excluding summaries)
  const files = readdirSync(absPath)
    .filter(f => f.startsWith('concepts-') && f.endsWith('.json') && !f.includes('-summary'))
    .sort();

  const allConcepts: ExtractedConcept[] = [];
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(absPath, f), 'utf-8')) as ExtractedConcept[];
    allConcepts.push(...data);
  }
  return allConcepts;
}

function loadSegmentFiles(inputPath: string): TextSegment[] {
  const absPath = resolve(process.cwd(), inputPath);

  if (!existsSync(absPath)) {
    console.error(`Error: path does not exist: ${absPath}`);
    process.exit(1);
  }

  const stat = statSync(absPath);

  if (stat.isFile()) {
    const pf = JSON.parse(readFileSync(absPath, 'utf-8')) as ProcessedFile;
    return pf.segments;
  }

  const files = readdirSync(absPath)
    .filter(f => f.endsWith('.json') && f !== 'summary.json')
    .sort();

  const allSegments: TextSegment[] = [];
  for (const f of files) {
    const pf = JSON.parse(readFileSync(join(absPath, f), 'utf-8')) as ProcessedFile;
    allSegments.push(...pf.segments);
  }
  return allSegments;
}

// ── Convert to chunks ───────────────────────────────────────────────

function conceptsToChunks(concepts: ExtractedConcept[]): ChunkToEmbed[] {
  return concepts.map(c => {
    // Build rich text for embedding: concept + claim + example
    const parts = [
      `Концепт: ${c.concept}`,
      `Утверждение: ${c.claim}`,
    ];
    if (c.example) parts.push(`Пример: ${c.example}`);
    if (c.academic_sources.length > 0) {
      parts.push(`Источники: ${c.academic_sources.join('; ')}`);
    }

    return {
      content: parts.join('\n'),
      source: c.source,
      category: c.tags[0] ?? 'general',
      topic: c.concept,
      branch: c.branch,
      metadata: {
        conceptId: c.id,
        difficulty: c.difficulty,
        trustLevel: c.trust_level,
        tags: c.tags,
        potentialQuestions: c.potential_questions,
        academicSources: c.academic_sources,
      },
    };
  });
}

function segmentsToChunks(segments: TextSegment[]): ChunkToEmbed[] {
  return segments.map(s => ({
    content: s.content,
    source: s.source,
    category: s.category ?? 'general',
    topic: s.topic ?? 'general',
    branch: s.branch ?? 'STRATEGY',
    metadata: {
      segmentId: s.id,
      segmentIndex: s.segmentIndex,
      totalSegments: s.totalSegments,
      wordCount: s.wordCount,
      sourceFile: s.sourceFile,
    },
  }));
}

// ── Embedding ───────────────────────────────────────────────────────

async function generateEmbeddings(
  openai: OpenAI,
  texts: string[],
  verbose: boolean,
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  if (verbose) {
    console.log(`  Embedding API: ${texts.length} texts, ${response.usage.total_tokens} tokens`);
  }

  // Sort by index to match input order
  const sorted = response.data.sort((a, b) => a.index - b.index);
  return sorted.map(d => d.embedding);
}

// ── Database ────────────────────────────────────────────────────────

async function insertChunkWithEmbedding(
  prisma: PrismaClient,
  chunk: ChunkToEmbed,
  embedding: number[],
): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO knowledge_chunks (id, content, source, category, topic, branch, metadata, embedding, "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::\"Branch\", $6::jsonb, $7::vector, NOW())`,
    chunk.content,
    chunk.source,
    chunk.category,
    chunk.topic,
    chunk.branch,
    JSON.stringify(chunk.metadata),
    vectorStr,
  );
}

async function getExistingCount(prisma: PrismaClient): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`SELECT count(*) FROM knowledge_chunks`;
  return Number(result[0].count);
}

// ── Main ────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('embed-content')
  .description('Generate embeddings and store in pgvector knowledge_chunks table')
  .option('-i, --input <path>', 'Input file or directory', 'scripts/output')
  .option('-m, --mode <mode>', 'Input mode: concepts (BC3 output) or segments (BC2 output)', 'concepts')
  .option('--batch-size <n>', 'Texts per embedding API call (max 2048)', '50')
  .option('--delay <ms>', 'Delay between API batches in ms', '200')
  .option('--verbose', 'Verbose output', false)
  .option('--dry-run', 'Generate embeddings but don\'t write to DB', false);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const mode = opts.mode as 'concepts' | 'segments';
  const batchSize = Math.min(parseInt(opts.batchSize, 10), 2048);
  const delayMs = parseInt(opts.delay, 10);
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;

  // Load data
  let chunks: ChunkToEmbed[];

  if (mode === 'concepts') {
    const concepts = loadConceptFiles(opts.input);
    console.log(`Loaded ${concepts.length} concept(s) from ${opts.input}`);
    chunks = conceptsToChunks(concepts);
  } else {
    const segments = loadSegmentFiles(opts.input);
    console.log(`Loaded ${segments.length} segment(s) from ${opts.input}`);
    chunks = segmentsToChunks(segments);
  }

  if (chunks.length === 0) {
    console.warn('No chunks to embed');
    process.exit(0);
  }

  // Initialize clients
  const openai = new OpenAI();
  const prisma = new PrismaClient();

  try {
    // Check DB connection
    if (!dryRun) {
      const existingCount = await getExistingCount(prisma);
      console.log(`Database: ${existingCount} existing chunks in knowledge_chunks`);
    }

    const startTime = Date.now();
    let embeddedCount = 0;
    let insertedCount = 0;
    const errors: Array<{ chunk: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchLabel = `[${Math.min(i + batchSize, chunks.length)}/${chunks.length}]`;

      console.log(`${batchLabel} Embedding batch of ${batch.length}...`);

      try {
        // Generate embeddings for batch
        const texts = batch.map(c => c.content);
        const embeddings = await generateEmbeddings(openai, texts, verbose);
        embeddedCount += embeddings.length;

        // Insert into DB
        if (!dryRun) {
          for (let j = 0; j < batch.length; j++) {
            try {
              await insertChunkWithEmbedding(prisma, batch[j], embeddings[j]);
              insertedCount++;
            } catch (dbErr: unknown) {
              const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
              console.error(`  DB error for "${batch[j].topic}": ${msg}`);
              errors.push({ chunk: batch[j].topic, error: msg });
            }
          }
        } else {
          insertedCount += batch.length;
          if (verbose) {
            for (const c of batch) {
              console.log(`  [dry-run] Would insert: "${c.topic}" (${c.branch})`);
            }
          }
        }
      } catch (apiErr: unknown) {
        const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.error(`  Embedding API error: ${msg}`);
        for (const c of batch) {
          errors.push({ chunk: c.topic, error: msg });
        }
      }

      // Rate limit delay
      if (i + batchSize < chunks.length && delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    // Final count
    let finalCount = 0;
    if (!dryRun) {
      finalCount = await getExistingCount(prisma);
    }

    const elapsed = Date.now() - startTime;

    // Print summary
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  Embedding Summary');
    console.log('═══════════════════════════════════════');
    console.log(`  Mode:       ${mode}`);
    console.log(`  Chunks:     ${chunks.length}`);
    console.log(`  Embedded:   ${embeddedCount}`);
    console.log(`  Inserted:   ${insertedCount}${dryRun ? ' (dry run)' : ''}`);
    if (!dryRun) {
      console.log(`  DB total:   ${finalCount}`);
    }
    console.log(`  Time:       ${(elapsed / 1000).toFixed(1)}s`);
    if (errors.length > 0) {
      console.log(`  Errors:     ${errors.length}`);
      for (const e of errors) {
        console.log(`    - ${e.chunk}: ${e.error}`);
      }
    }
    console.log('═══════════════════════════════════════');

    if (errors.length > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
