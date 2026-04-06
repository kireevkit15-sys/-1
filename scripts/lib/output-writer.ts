import * as fs from 'fs';
import * as path from 'path';
import { ProcessedFile, ProcessingSummary } from './content-types';

/**
 * Writes processed file segments to JSON.
 * Output: {outputDir}/{sourceName}/segments.json
 */
export async function writeProcessedFile(
  result: ProcessedFile,
  outputDir: string,
): Promise<string> {
  const segmentDir = path.join(
    outputDir,
    ...result.sourceName.split('/'),
  );

  await fs.promises.mkdir(segmentDir, { recursive: true });

  const filePath = path.join(segmentDir, 'segments.json');

  const output = {
    source: result.sourceName,
    sourceFile: result.sourceFile,
    format: result.format,
    metadata: result.metadata,
    cleaningStats: result.cleaningStats,
    segments: result.segments,
    processedAt: result.processedAt,
  };

  await fs.promises.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');

  return filePath;
}

/**
 * Writes processing summary to JSON.
 */
export async function writeSummary(
  summary: ProcessingSummary,
  outputDir: string,
): Promise<string> {
  await fs.promises.mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, 'processing-summary.json');

  await fs.promises.writeFile(filePath, JSON.stringify(summary, null, 2), 'utf-8');

  return filePath;
}

/**
 * Prints a formatted summary to console.
 */
export function printSummary(summary: ProcessingSummary): void {
  const avgWords =
    summary.totalSegments > 0
      ? Math.round(summary.totalWords / summary.totalSegments)
      : 0;
  const timeSeconds = (summary.processingTimeMs / 1000).toFixed(1);

  const bar = '═══════════════════════════════════════';

  console.log(bar);
  console.log(' Content Processing Summary');
  console.log(bar);
  console.log(` Files processed: ${summary.successFiles}/${summary.totalFiles} (${summary.failedFiles} failed)`);
  console.log(` Total segments:  ${summary.totalSegments}`);
  console.log(` Total words:     ${summary.totalWords.toLocaleString('en-US')}`);
  console.log(` Avg words/segment: ${avgWords}`);
  console.log(` Processing time: ${timeSeconds}s`);
  console.log(bar);

  if (summary.errors.length > 0) {
    console.log('');
    console.log(' Errors:');
    for (const error of summary.errors) {
      console.log(`  - [${error.file}] ${error.error}`);
    }
  }
}
