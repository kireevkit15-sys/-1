import * as fs from 'fs';
import * as path from 'path';
import { RawDocument } from './content-types';

/**
 * Reads a plain text file and returns a RawDocument.
 */
export async function parseTxt(filePath: string): Promise<RawDocument> {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);
    let text = fs.readFileSync(absolutePath, 'utf-8');

    // Strip BOM (Byte Order Mark) if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    // Extract title from filename: remove extension, replace hyphens/underscores with spaces
    const fileName = path.basename(filePath, path.extname(filePath));
    const title = fileName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      filePath: absolutePath,
      format: 'txt',
      text,
      metadata: {
        title,
        author: undefined,
        pageCount: undefined,
        fileSize: stats.size,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read TXT: ${filePath}: ${message}`);
  }
}
