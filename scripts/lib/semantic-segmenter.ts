import { TextSegment } from './content-types';

export interface SegmentOptions {
  minWords: number;
  maxWords: number;
  overlapPercent: number;
  source: string;
  sourceFile: string;
  category?: string;
  topic?: string;
  branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
}

const DEFAULT_OPTIONS: Pick<SegmentOptions, 'minWords' | 'maxWords' | 'overlapPercent'> = {
  minWords: 200,
  maxWords: 500,
  overlapPercent: 10,
};

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function formatIndex(index: number): string {
  return String(index).padStart(3, '0');
}

/**
 * Split a single paragraph into sentences.
 * Splits on `. ` or `.\n` while preserving the period.
 */
function splitIntoSentences(paragraph: string): string[] {
  const parts = paragraph.split(/(?<=\.)\s+/);
  return parts.filter((s) => s.trim().length > 0);
}

/**
 * Split a block of text into chunks of at most maxWords words.
 * Used as a last resort when a single sentence exceeds maxWords.
 */
function splitByWordCount(text: string, maxWords: number): string[] {
  const words = getWords(text);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

/**
 * Break a paragraph that exceeds maxWords into smaller pieces,
 * each at most maxWords words. First tries sentence splitting,
 * then falls back to raw word-count splitting.
 */
function breakLargeParagraph(paragraph: string, maxWords: number): string[] {
  const sentences = splitIntoSentences(paragraph);
  const pieces: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);

    if (sentenceWordCount > maxWords) {
      if (buffer.trim().length > 0) {
        pieces.push(buffer.trim());
        buffer = '';
      }
      const subChunks = splitByWordCount(sentence, maxWords);
      pieces.push(...subChunks);
      continue;
    }

    const combined = buffer ? `${buffer} ${sentence}` : sentence;
    if (countWords(combined) > maxWords) {
      if (buffer.trim().length > 0) {
        pieces.push(buffer.trim());
      }
      buffer = sentence;
    } else {
      buffer = combined;
    }
  }

  if (buffer.trim().length > 0) {
    pieces.push(buffer.trim());
  }

  return pieces;
}

/**
 * Segments cleaned, normalized text into semantic chunks of 200-500 words
 * with configurable overlap between consecutive segments.
 */
export function segmentText(
  text: string,
  options: Partial<SegmentOptions> & Pick<SegmentOptions, 'source' | 'sourceFile'>,
): TextSegment[] {
  const opts: SegmentOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as SegmentOptions;

  const { minWords, maxWords, overlapPercent, source, sourceFile, category, topic, branch } = opts;

  // Step 1: Split text into paragraphs by double newline
  const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // Step 2: Expand paragraphs that exceed maxWords
  const paragraphs: string[] = [];
  for (const para of rawParagraphs) {
    if (countWords(para) > maxWords) {
      paragraphs.push(...breakLargeParagraph(para, maxWords));
    } else {
      paragraphs.push(para);
    }
  }

  // Step 3: Accumulate paragraphs into segments
  const rawSegments: string[] = [];
  let currentBuffer = '';

  for (const para of paragraphs) {
    const combined = currentBuffer ? `${currentBuffer}\n\n${para}` : para;
    const combinedWordCount = countWords(combined);

    if (combinedWordCount > maxWords && countWords(currentBuffer) > 0) {
      rawSegments.push(currentBuffer.trim());
      currentBuffer = para;
    } else {
      currentBuffer = combined;
    }
  }

  // Flush remaining buffer
  if (currentBuffer.trim().length > 0) {
    if (rawSegments.length > 0 && countWords(currentBuffer) < minWords) {
      const prev = rawSegments.pop()!;
      const merged = `${prev}\n\n${currentBuffer.trim()}`;
      if (countWords(merged) > maxWords * 1.5) {
        rawSegments.push(prev);
        rawSegments.push(currentBuffer.trim());
      } else {
        rawSegments.push(merged);
      }
    } else {
      rawSegments.push(currentBuffer.trim());
    }
  }

  // Merge any internal segments smaller than minWords
  const mergedSegments: string[] = [];
  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    if (
      countWords(seg) < minWords &&
      i < rawSegments.length - 1 &&
      mergedSegments.length > 0
    ) {
      const prev = mergedSegments[mergedSegments.length - 1];
      const merged = `${prev}\n\n${seg}`;
      if (countWords(merged) <= maxWords * 1.5) {
        mergedSegments[mergedSegments.length - 1] = merged;
        continue;
      }
    }
    if (countWords(seg) < minWords && i < rawSegments.length - 1) {
      rawSegments[i + 1] = `${seg}\n\n${rawSegments[i + 1]}`;
      continue;
    }
    mergedSegments.push(seg);
  }

  const finalRawSegments = mergedSegments.length > 0 ? mergedSegments : rawSegments;

  // Step 4: Apply overlap and build TextSegment objects
  const segments: TextSegment[] = [];

  for (let i = 0; i < finalRawSegments.length; i++) {
    const segContent = finalRawSegments[i];
    let overlapWithPrev = 0;
    let finalContent = segContent;

    if (i > 0 && overlapPercent > 0) {
      const prevWords = getWords(finalRawSegments[i - 1]);
      const overlapWordCount = Math.floor((prevWords.length * overlapPercent) / 100);

      if (overlapWordCount > 0) {
        const overlapWords = prevWords.slice(-overlapWordCount);
        finalContent = `${overlapWords.join(' ')} ${segContent}`;
        overlapWithPrev = overlapWordCount;
      }
    }

    const segment: TextSegment = {
      id: `${source}_${formatIndex(i)}`,
      content: finalContent,
      source,
      sourceFile,
      segmentIndex: i,
      totalSegments: finalRawSegments.length,
      wordCount: countWords(finalContent),
      charCount: finalContent.length,
      overlapWithPrev,
      ...(category !== undefined && { category }),
      ...(topic !== undefined && { topic }),
      ...(branch !== undefined && { branch }),
    };

    segments.push(segment);
  }

  // Update totalSegments in case of changes
  for (const seg of segments) {
    seg.totalSegments = segments.length;
  }

  return segments;
}
