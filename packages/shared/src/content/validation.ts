import { QuestionData, Branch } from '../questions/types';
import { Difficulty } from '../battle/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single question for correctness and quality
 */
export function validateQuestion(q: Partial<QuestionData>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!q.text || typeof q.text !== 'string') {
    errors.push('Missing or invalid text');
  } else {
    if (q.text.length < 20) errors.push('Question text too short (min 20 chars)');
    if (q.text.length > 500) errors.push('Question text too long (max 500 chars)');
  }

  // Options
  if (!Array.isArray(q.options)) {
    errors.push('Options must be an array');
  } else {
    if (q.options.length !== 4) errors.push('Must have exactly 4 options');
    if (q.options.length > 0) {
      const uniqueOptions = new Set(q.options.map((o) => o.toLowerCase().trim()));
      if (uniqueOptions.size !== q.options.length) errors.push('All options must be unique');
      q.options.forEach((opt, i) => {
        if (!opt || opt.length < 2) errors.push(`Option ${i} too short`);
        if (opt && opt.length > 200) errors.push(`Option ${i} too long (max 200 chars)`);
      });
    }
  }

  // Correct index
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
    errors.push('correctIndex must be 0-3');
  }

  // Explanation
  if (!q.explanation || typeof q.explanation !== 'string') {
    errors.push('Missing explanation');
  } else if (q.explanation.length < 30) {
    warnings.push('Explanation is very short (< 30 chars)');
  }

  // Branch
  if (q.branch && !Object.values(Branch).includes(q.branch as Branch)) {
    errors.push('Invalid branch');
  }

  // Difficulty
  if (q.difficulty && !Object.values(Difficulty).includes(q.difficulty as Difficulty)) {
    errors.push('Invalid difficulty');
  }

  // Category
  if (!q.category || typeof q.category !== 'string') {
    errors.push('Missing category');
  }

  // Stat
  if (!q.statPrimary) {
    warnings.push('Missing statPrimary');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a batch of questions and returns stats
 */
export function validateBatch(questions: Partial<QuestionData>[]): {
  valid: QuestionData[];
  invalid: Array<{ question: Partial<QuestionData>; result: ValidationResult }>;
  stats: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
} {
  const valid: QuestionData[] = [];
  const invalid: Array<{ question: Partial<QuestionData>; result: ValidationResult }> = [];
  let warningsCount = 0;

  for (const q of questions) {
    const result = validateQuestion(q);
    if (result.isValid) {
      valid.push(q as QuestionData);
    } else {
      invalid.push({ question: q, result });
    }
    if (result.warnings.length > 0) {
      warningsCount += result.warnings.length;
    }
  }

  return {
    valid,
    invalid,
    stats: {
      total: questions.length,
      valid: valid.length,
      invalid: invalid.length,
      warnings: warningsCount,
    },
  };
}

/**
 * Tokenizes text into a set of normalized words for similarity comparison.
 * Strips punctuation, lowercases, and filters out very short tokens.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2),
  );
}

/**
 * Computes Jaccard similarity between two sets.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 1;
  return intersection / union;
}

/**
 * Checks if a new question is too similar to existing ones (simple text similarity).
 * Returns similarity score 0-1 (1 = identical).
 * Threshold: 0.7 = likely duplicate.
 */
export function checkDuplicateSimple(
  newQuestion: string,
  existingQuestions: string[],
): {
  isDuplicate: boolean;
  maxSimilarity: number;
  mostSimilarQuestion: string | null;
} {
  const DUPLICATE_THRESHOLD = 0.7;

  if (existingQuestions.length === 0) {
    return {
      isDuplicate: false,
      maxSimilarity: 0,
      mostSimilarQuestion: null,
    };
  }

  const newTokens = tokenize(newQuestion);

  let maxSimilarity = 0;
  let mostSimilarQuestion: string | null = null;

  for (const existing of existingQuestions) {
    const existingTokens = tokenize(existing);
    const similarity = jaccardSimilarity(newTokens, existingTokens);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarQuestion = existing;
    }
  }

  return {
    isDuplicate: maxSimilarity >= DUPLICATE_THRESHOLD,
    maxSimilarity: Math.round(maxSimilarity * 1000) / 1000,
    mostSimilarQuestion,
  };
}

/**
 * Checks difficulty consistency:
 * - BRONZE questions should not have complex terminology
 * - GOLD questions should not be trivially answerable
 *
 * Uses simple heuristics based on text length, option complexity, etc.
 */
export function checkDifficultyConsistency(q: QuestionData): {
  isConsistent: boolean;
  suggestedDifficulty?: 'BRONZE' | 'SILVER' | 'GOLD';
  reason?: string;
} {
  const textLength = q.text.length;
  const avgOptionLength =
    q.options.reduce((sum, opt) => sum + opt.length, 0) / q.options.length;
  const explanationLength = q.explanation.length;

  // Count words with 8+ characters as "complex" words
  const complexWordCount = q.text
    .split(/\s+/)
    .filter((w) => w.length >= 8).length;

  // Count total word count
  const totalWords = q.text.split(/\s+/).filter((w) => w.length > 0).length;

  // Complexity score: 0-100
  let complexityScore = 0;

  // Text length contributes to complexity (longer = harder)
  if (textLength > 200) complexityScore += 30;
  else if (textLength > 100) complexityScore += 15;
  else complexityScore += 5;

  // Average option length (longer options = harder to parse)
  if (avgOptionLength > 50) complexityScore += 25;
  else if (avgOptionLength > 25) complexityScore += 15;
  else complexityScore += 5;

  // Complex words ratio
  const complexRatio = totalWords > 0 ? complexWordCount / totalWords : 0;
  if (complexRatio > 0.3) complexityScore += 25;
  else if (complexRatio > 0.15) complexityScore += 15;
  else complexityScore += 5;

  // Explanation length (complex topics need longer explanations)
  if (explanationLength > 200) complexityScore += 20;
  else if (explanationLength > 100) complexityScore += 10;
  else complexityScore += 5;

  // Determine suggested difficulty based on score
  let suggestedDifficulty: 'BRONZE' | 'SILVER' | 'GOLD';
  if (complexityScore <= 35) {
    suggestedDifficulty = 'BRONZE';
  } else if (complexityScore <= 65) {
    suggestedDifficulty = 'SILVER';
  } else {
    suggestedDifficulty = 'GOLD';
  }

  const isConsistent = suggestedDifficulty === q.difficulty;

  if (isConsistent) {
    return { isConsistent };
  }

  // Build explanation for mismatch
  const reasons: string[] = [];

  if (q.difficulty === Difficulty.BRONZE && suggestedDifficulty !== 'BRONZE') {
    if (complexRatio > 0.15) {
      reasons.push('too many complex words for BRONZE level');
    }
    if (textLength > 200) {
      reasons.push('question text is unusually long for BRONZE');
    }
    if (avgOptionLength > 50) {
      reasons.push('options are too complex for BRONZE');
    }
  }

  if (q.difficulty === Difficulty.GOLD && suggestedDifficulty !== 'GOLD') {
    if (textLength < 100) {
      reasons.push('question text is too short for GOLD level');
    }
    if (complexRatio < 0.15) {
      reasons.push('vocabulary is too simple for GOLD');
    }
    if (avgOptionLength < 25) {
      reasons.push('options are too simple for GOLD');
    }
  }

  if (q.difficulty === Difficulty.SILVER) {
    if (suggestedDifficulty === 'BRONZE') {
      reasons.push('content complexity suggests BRONZE level');
    } else {
      reasons.push('content complexity suggests GOLD level');
    }
  }

  return {
    isConsistent,
    suggestedDifficulty,
    reason:
      reasons.length > 0
        ? reasons.join('; ')
        : `Complexity score ${complexityScore} suggests ${suggestedDifficulty} instead of ${q.difficulty}`,
  };
}
