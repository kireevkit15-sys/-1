import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { RawDocument } from './content-types';

/**
 * Extracts text and metadata from a PDF file using pdf-parse v2.
 * Uses getText() for content and getInfo() for metadata.
 */
export async function parsePdf(filePath: string): Promise<RawDocument> {
  try {
    const absolutePath = path.resolve(filePath);
    const buffer = fs.readFileSync(absolutePath);
    const uint8 = new Uint8Array(buffer);
    const stats = fs.statSync(absolutePath);

    const parser = new PDFParse({ data: uint8 });
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo(),
    ]);

    return {
      filePath: absolutePath,
      format: 'pdf',
      text: textResult.text,
      metadata: {
        title: infoResult.info?.Title || path.basename(filePath, '.pdf'),
        author: infoResult.info?.Author || undefined,
        pageCount: textResult.total,
        fileSize: stats.size,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse PDF: ${filePath}: ${message}`);
  }
}
