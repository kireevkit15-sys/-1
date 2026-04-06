#!/usr/bin/env ts-node

import { resolve, relative } from 'path';
import { Command } from 'commander';

import {
  ProcessOptions,
  ProcessedFile,
  ProcessingSummary,
  RawDocument,
} from './lib/content-types';
import { parsePdf } from './lib/pdf-parser';
import { parseTxt } from './lib/txt-parser';
import { cleanText } from './lib/text-cleaner';
import { normalizeText } from './lib/text-normalizer';
import { segmentText } from './lib/semantic-segmenter';
import { scanForFiles } from './lib/file-scanner';
import { writeProcessedFile, writeSummary, printSummary } from './lib/output-writer';

/**
 * BC2 — Content Processing Pipeline CLI
 *
 * Orchestrates: scan → parse → normalize → clean → segment → write.
 * Processes PDF and TXT source files into semantically segmented chunks
 * ready for embedding and storage in the knowledge base.
 */

const program = new Command();

program
  .name('process-content')
  .description('Process source documents into segmented knowledge chunks')
  .option('-i, --input <dir>', 'Input directory', 'content/sources')
  .option('-o, --output <dir>', 'Output directory', 'content/processed')
  .option('--min-words <n>', 'Min words per segment', '200')
  .option('--max-words <n>', 'Max words per segment', '500')
  .option('--overlap <percent>', 'Overlap percentage between segments', '10')
  .option('--category <name>', 'Set category for all segments')
  .option('--topic <name>', 'Set topic for all segments')
  .option('--branch <STRATEGY|LOGIC>', 'Set branch for all segments')
  .option('--verbose', 'Verbose output', false)
  .option('--dry-run', 'Parse and clean but don\'t write output', false);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const inputDir = resolve(process.cwd(), opts.input);
  const outputDir = resolve(process.cwd(), opts.output);

  const options: ProcessOptions = {
    input: inputDir,
    output: outputDir,
    minWords: parseInt(opts.minWords, 10),
    maxWords: parseInt(opts.maxWords, 10),
    overlap: parseInt(opts.overlap, 10),
    category: opts.category,
    topic: opts.topic,
    branch: opts.branch,
    verbose: opts.verbose as boolean,
    dryRun: opts.dryRun as boolean,
  };

  // Validate
  if (isNaN(options.minWords) || options.minWords <= 0) {
    console.error('Error: --min-words must be a positive integer');
    process.exit(1);
  }
  if (isNaN(options.maxWords) || options.maxWords <= 0) {
    console.error('Error: --max-words must be a positive integer');
    process.exit(1);
  }
  if (options.minWords > options.maxWords) {
    console.error('Error: --min-words cannot be greater than --max-words');
    process.exit(1);
  }
  if (isNaN(options.overlap) || options.overlap < 0 || options.overlap > 50) {
    console.error('Error: --overlap must be an integer between 0 and 50');
    process.exit(1);
  }

  if (options.verbose) {
    console.log('Configuration:');
    console.log(`  Input:     ${inputDir}`);
    console.log(`  Output:    ${outputDir}`);
    console.log(`  Words:     ${options.minWords}–${options.maxWords}`);
    console.log(`  Overlap:   ${options.overlap}%`);
    console.log(`  Category:  ${options.category ?? '(auto)'}`);
    console.log(`  Topic:     ${options.topic ?? '(auto)'}`);
    console.log(`  Branch:    ${options.branch ?? '(auto)'}`);
    console.log(`  Dry run:   ${options.dryRun}`);
    console.log('');
  }

  // Step 1: Scan for source files
  const sourceFiles = await scanForFiles(inputDir, { verbose: options.verbose });

  if (sourceFiles.length === 0) {
    console.warn('Warning: No PDF or TXT files found in', inputDir);
    process.exit(0);
  }

  console.log(`Found ${sourceFiles.length} file(s) to process\n`);

  const processedFiles: ProcessedFile[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  const startTime = Date.now();

  // Step 2: Process each file sequentially
  for (let i = 0; i < sourceFiles.length; i++) {
    const sf = sourceFiles[i];
    const fileLabel = sf.relativePath;
    const progress = `[${i + 1}/${sourceFiles.length}]`;

    console.log(`${progress} Processing: ${sf.sourceName} (${sf.format})`);

    try {
      // 2a. Parse raw text from file
      const rawDoc: RawDocument = sf.format === 'pdf'
        ? await parsePdf(sf.filePath)
        : await parseTxt(sf.filePath);

      if (options.verbose) {
        console.log(`  Parsed: ${rawDoc.text.length} chars, ${rawDoc.metadata.pageCount ?? '?'} pages`);
      }

      // 2b. Normalize text (encoding, whitespace, unicode)
      const normalizedText = normalizeText(rawDoc.text);

      if (options.verbose) {
        console.log(`  Normalized: ${normalizedText.length} chars`);
      }

      // 2c. Clean text (remove noise, headers/footers)
      const normalizedDoc: RawDocument = {
        ...rawDoc,
        text: normalizedText,
      };
      const cleanedDoc = cleanText(normalizedDoc);

      if (options.verbose) {
        console.log(`  Cleaned: ${cleanedDoc.text.length} chars (removed ${cleanedDoc.cleaningStats.removedPercent}%)`);
      }

      // 2d. Segment text into chunks
      const segments = segmentText(cleanedDoc.text, {
        minWords: options.minWords,
        maxWords: options.maxWords,
        overlapPercent: options.overlap,
        source: sf.sourceName,
        sourceFile: sf.filePath,
        category: options.category,
        topic: options.topic,
        branch: options.branch,
      });

      // 2e. Build ProcessedFile
      const totalWords = segments.reduce((sum, seg) => sum + seg.wordCount, 0);

      const processedFile: ProcessedFile = {
        sourceFile: sf.filePath,
        sourceName: sf.sourceName,
        format: sf.format,
        metadata: rawDoc.metadata,
        cleaningStats: cleanedDoc.cleaningStats,
        segments,
        processedAt: new Date().toISOString(),
      };

      // 2f. Write output (unless dry-run)
      if (!options.dryRun) {
        const writtenPath = await writeProcessedFile(processedFile, outputDir);
        if (options.verbose) {
          console.log(`  Written: ${writtenPath}`);
        }
      }

      processedFiles.push(processedFile);

      console.log(
        `  -> ${segments.length} segments, ${totalWords.toLocaleString()} words${options.dryRun ? ' (dry run)' : ''}`,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`  x Error: ${errorMessage}`);
      errors.push({ file: fileLabel, error: errorMessage });
    }
  }

  // Step 3: Build summary
  const processingTimeMs = Date.now() - startTime;
  const totalSegments = processedFiles.reduce((sum, f) => sum + f.segments.length, 0);
  const totalWords = processedFiles.reduce(
    (sum, f) => sum + f.segments.reduce((s, seg) => s + seg.wordCount, 0),
    0,
  );

  const summary: ProcessingSummary = {
    totalFiles: sourceFiles.length,
    successFiles: processedFiles.length,
    failedFiles: errors.length,
    totalSegments,
    totalWords,
    avgSegmentWords: totalSegments > 0 ? Math.round(totalWords / totalSegments) : 0,
    processingTimeMs,
    errors,
  };

  // Step 4: Write summary and print results
  if (!options.dryRun) {
    await writeSummary(summary, outputDir);
  }

  console.log('');
  printSummary(summary);

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
