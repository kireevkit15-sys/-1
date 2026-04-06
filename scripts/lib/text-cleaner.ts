import { RawDocument, CleanedDocument } from './content-types';

/**
 * Cleans raw text extracted from PDF/TXT files by removing noise
 * while preserving paragraph structure.
 */
export function cleanText(doc: RawDocument): CleanedDocument {
  const originalLength = doc.text.length;
  let text = doc.text;

  // --- Step 1: Remove page numbers ---
  // Lines that are just digits, optionally surrounded by dashes, or prefixed with "Page"/"Стр."
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Pure number: "42"
      if (/^\d+$/.test(trimmed)) return false;
      // Dashed number: "— 15 —", "- 15 -", "-- 15 --"
      if (/^[-—–]+\s*\d+\s*[-—–]+$/.test(trimmed)) return false;
      // "Page 12", "page 12"
      if (/^page\s+\d+$/i.test(trimmed)) return false;
      // "Стр. 5", "стр 5"
      if (/^стр\.?\s*\d+$/i.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  // --- Step 2: Remove repeated headers/footers ---
  // Short lines (<50 chars) appearing more than 3 times are likely headers/footers
  const lineCounts = new Map<string, number>();
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 50) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) ?? 0) + 1);
    }
  }

  const repeatedLines = new Set<string>();
  for (const [line, count] of lineCounts) {
    if (count > 3) {
      repeatedLines.add(line);
    }
  }

  text = lines
    .filter((line) => !repeatedLines.has(line.trim()))
    .join('\n');

  // --- Step 3: Remove excessive whitespace ---
  // Collapse 3+ consecutive newlines into 2 (preserving paragraph breaks)
  text = text.replace(/\n{3,}/g, '\n\n');
  // Collapse multiple spaces into one
  text = text.replace(/ {2,}/g, ' ');

  // --- Step 4: Remove control characters (except \n and \t) ---
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // --- Step 5: Remove separator lines ---
  // Lines composed entirely of dashes, dots, equals, underscores
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return true;
      if (/^[-—–_.=\s]+$/.test(trimmed)) return false;
      return true;
    })
    .join('\n');

  // --- Step 6: Trim each line ---
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // --- Step 7: Remove empty lines at start and end ---
  text = text.replace(/^\n+/, '').replace(/\n+$/, '');

  // --- Calculate cleaning stats ---
  const cleanedLength = text.length;
  const removedChars = originalLength - cleanedLength;
  const removedPercent =
    originalLength > 0
      ? Math.round((removedChars / originalLength) * 10000) / 100
      : 0;

  return {
    filePath: doc.filePath,
    text,
    metadata: doc.metadata,
    cleaningStats: {
      originalLength,
      cleanedLength,
      removedChars,
      removedPercent,
    },
  };
}
