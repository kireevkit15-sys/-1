import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';
import { RawDocument } from './content-types';

/**
 * Parses an FB2 (FictionBook2) file and returns a RawDocument.
 * FB2 is XML-based — we extract text from <p>, <title>, <subtitle>,
 * <epigraph>, <annotation> tags within <body>.
 *
 * Supports encodings: UTF-8, windows-1251, koi8-r, cp866
 */
export async function parseFb2(filePath: string): Promise<RawDocument> {
  try {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);

    const rawBuffer = fs.readFileSync(absolutePath);

    // Detect encoding from XML declaration
    const encoding = detectEncoding(rawBuffer);
    let xml = iconv.decode(rawBuffer, encoding);

    // Strip BOM if present
    if (xml.charCodeAt(0) === 0xfeff) {
      xml = xml.slice(1);
    }

    // Extract metadata from <description>
    const title = extractTag(xml, 'book-title') || path.basename(filePath, path.extname(filePath));
    const author = extractAuthor(xml);

    // Extract text from <body>
    const text = extractBodyText(xml);

    return {
      filePath: absolutePath,
      format: 'fb2',
      text,
      metadata: {
        title,
        author,
        pageCount: undefined,
        fileSize: stats.size,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse FB2: ${filePath}: ${message}`);
  }
}

/**
 * Detects encoding from the XML declaration <?xml ... encoding="..."?>
 * Falls back to utf-8 if not found.
 */
function detectEncoding(buffer: Buffer): string {
  // Read first 200 bytes as ascii to find the XML declaration
  const header = buffer.subarray(0, 200).toString('ascii');
  const match = header.match(/encoding=["']([^"']+)["']/i);

  if (match) {
    const enc = match[1].toLowerCase();
    // Map common encoding names
    const encodingMap: Record<string, string> = {
      'windows-1251': 'win1251',
      'cp1251': 'win1251',
      'win-1251': 'win1251',
      'koi8-r': 'koi8-r',
      'koi8r': 'koi8-r',
      'cp866': 'cp866',
      'ibm866': 'cp866',
      'utf-8': 'utf-8',
      'utf8': 'utf-8',
    };
    return encodingMap[enc] || enc;
  }

  return 'utf-8';
}

/**
 * Extracts plain text content from FB2 <body> sections.
 * Handles: <p>, <title>, <subtitle>, <epigraph>, <text-author>, <annotation>
 */
function extractBodyText(xml: string): string {
  // Get all <body> sections
  const bodyMatches = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/gi);
  if (!bodyMatches) return '';

  const lines: string[] = [];

  for (const body of bodyMatches) {
    // Skip notes/comments body
    if (body.match(/<body\s+name=["']notes["']/i)) continue;

    // Extract section titles
    const titleRegex = /<title>\s*([\s\S]*?)\s*<\/title>/gi;
    let processed = body;

    // Replace titles with text + newlines for separation
    processed = processed.replace(titleRegex, (_match, content: string) => {
      const titleText = stripTags(content).trim();
      return titleText ? `\n\n## ${titleText}\n\n` : '';
    });

    // Extract <p> tags content
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(processed)) !== null) {
      const text = stripTags(match[1]).trim();
      if (text) lines.push(text);
    }

    // If no <p> tags found, try extracting all text
    if (lines.length === 0) {
      const text = stripTags(processed).trim();
      if (text) lines.push(text);
    }
  }

  return lines.join('\n\n');
}

/** Strip all XML/HTML tags from a string */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract content of a single XML tag */
function extractTag(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? stripTags(match[1]).trim() || undefined : undefined;
}

/** Extract author name from FB2 <author> tag */
function extractAuthor(xml: string): string | undefined {
  const authorMatch = xml.match(/<author>([\s\S]*?)<\/author>/i);
  if (!authorMatch) return undefined;

  const authorBlock = authorMatch[1];
  const firstName = extractTag(authorBlock, 'first-name') || '';
  const middleName = extractTag(authorBlock, 'middle-name') || '';
  const lastName = extractTag(authorBlock, 'last-name') || '';

  const name = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}
