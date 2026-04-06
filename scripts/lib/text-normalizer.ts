/**
 * text-normalizer.ts
 *
 * Normalizes cleaned text — fixes encoding issues, unicode, and whitespace.
 */

/** Map of Latin chars visually similar to Cyrillic ones */
const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: '\u0430', // а
  e: '\u0435', // е
  o: '\u043E', // о
  p: '\u0440', // р
  c: '\u0441', // с
  x: '\u0445', // х
  y: '\u0443', // у
  A: '\u0410', // А
  B: '\u0412', // В
  C: '\u0421', // С
  E: '\u0415', // Е
  H: '\u041D', // Н
  K: '\u041A', // К
  M: '\u041C', // М
  O: '\u041E', // О
  P: '\u0420', // Р
  T: '\u0422', // Т
  X: '\u0425', // Х
};

const LATIN_LOOKALIKES = new Set(Object.keys(LATIN_TO_CYRILLIC));

/**
 * Detects words containing mixed Latin/Cyrillic characters and normalizes
 * them by replacing Latin lookalikes with their Cyrillic equivalents.
 *
 * Only converts when a word is predominantly Cyrillic but contains a few
 * Latin lookalike characters — intentional Latin words are left untouched.
 */
export function fixMixedCyrillic(text: string): string {
  return text.replace(/[a-zA-Z\u0400-\u04FF]+/g, (word) => {
    let cyrillicCount = 0;
    let latinLookalikeCount = 0;
    let latinNonLookalikeCount = 0;

    for (const ch of word) {
      if (/[\u0400-\u04FF]/.test(ch)) {
        cyrillicCount++;
      } else if (LATIN_LOOKALIKES.has(ch)) {
        latinLookalikeCount++;
      } else if (/[a-zA-Z]/.test(ch)) {
        latinNonLookalikeCount++;
      }
    }

    // Only fix if the word has Cyrillic chars AND Latin lookalikes,
    // but NO non-lookalike Latin chars (which would indicate intentional Latin).
    if (cyrillicCount > 0 && latinLookalikeCount > 0 && latinNonLookalikeCount === 0) {
      return Array.from(word)
        .map((ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
        .join('');
    }

    return word;
  });
}

/** Common encoding artifact replacements (mojibake from UTF-8 misread as Windows-1252) */
const ENCODING_FIXES: [RegExp, string][] = [
  [/\u00E2\u0080\u0094/g, '\u2014'],   // â€" → —
  [/\u00E2\u0080\u0099/g, '\u2019'],   // â€™ → '
  [/\u00E2\u0080\u009C/g, '\u201C'],   // â€œ → "
  [/\u00E2\u0080\u009D/g, '\u201D'],   // â€ → "
  [/\u00C3\u00A9/g, '\u00E9'],         // Ã© → é
  [/\u00C3\u00A8/g, '\u00E8'],         // Ã¨ → è
  [/\u00C3\u00A0/g, '\u00E0'],         // Ã  → à
  [/\u00C3\u00BC/g, '\u00FC'],         // Ã¼ → ü
  [/\u00C3\u00B6/g, '\u00F6'],         // Ã¶ → ö
  [/\u00C3\u00A4/g, '\u00E4'],         // Ã¤ → ä
  [/\u00C3\u00B1/g, '\u00F1'],         // Ã± → ñ
];

/**
 * Normalizes text by fixing encoding issues, unicode, and whitespace.
 */
export function normalizeText(text: string): string {
  // 1. Unicode NFC normalization
  let result = text.normalize('NFC');

  // 2. Replace common encoding artifacts
  for (const [pattern, replacement] of ENCODING_FIXES) {
    result = result.replace(pattern, replacement);
  }

  // 3. Replace curly/smart quotes with straight quotes
  result = result
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')  // " " „ ‟ « » → "
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");               // ' ' ‚ ‛ → '

  // 4. Normalize dashes: en-dash and em-dash variations → standard em dash
  result = result.replace(/[\u2013\u2014\u2015]/g, '\u2014'); // –, —, ― → —

  // 5. Fix broken Cyrillic (mixed Latin/Cyrillic words)
  result = fixMixedCyrillic(result);

  // 6. Normalize ellipsis
  result = result
    .replace(/\.{3,}/g, '\u2026')   // ... → …
    .replace(/\u2025/g, '\u2026');   // ‥ → …

  // 7. Remove zero-width characters
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 8. Collapse multiple spaces to single space (preserve newlines)
  result = result.replace(/[^\S\n]+/g, ' ');

  return result;
}
