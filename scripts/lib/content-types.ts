/** Supported source file formats */
export type SourceFormat = 'pdf' | 'txt' | 'fb2';

/** Raw parsed document before cleaning */
export interface RawDocument {
  filePath: string;
  format: SourceFormat;
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
    fileSize: number;
  };
}

/** Cleaned document after noise removal */
export interface CleanedDocument {
  filePath: string;
  text: string;
  metadata: RawDocument['metadata'];
  cleaningStats: {
    originalLength: number;
    cleanedLength: number;
    removedChars: number;
    removedPercent: number;
  };
}

/** A single text segment (chunk) for embedding */
export interface TextSegment {
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
  branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
}

/** Output of the full pipeline for one file */
export interface ProcessedFile {
  sourceFile: string;
  sourceName: string;
  format: SourceFormat;
  metadata: RawDocument['metadata'];
  cleaningStats: CleanedDocument['cleaningStats'];
  segments: TextSegment[];
  processedAt: string;
}

/** CLI options for the process-content script */
export interface ProcessOptions {
  input: string;
  output: string;
  minWords: number;
  maxWords: number;
  overlap: number;
  category?: string;
  topic?: string;
  branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';
  verbose: boolean;
  dryRun: boolean;
}

/** Summary statistics for the entire processing run */
export interface ProcessingSummary {
  totalFiles: number;
  successFiles: number;
  failedFiles: number;
  totalSegments: number;
  totalWords: number;
  avgSegmentWords: number;
  processingTimeMs: number;
  errors: Array<{ file: string; error: string }>;
}
