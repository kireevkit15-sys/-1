/**
 * LC7 — Batch validation of all questions
 *
 * Validates all questions from:
 * 1. scripts/output/*.json (generated questions)
 * 2. prisma/seed-production-v2.ts hardcoded questions
 *
 * Runs: validateQuestion, checkDuplicateSimple, checkDifficultyConsistency
 * Outputs: JSON report to scripts/output/validation-report.json
 *
 * Usage: npx ts-node scripts/validate-questions.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateQuestion,
  checkDuplicateSimple,
  checkDifficultyConsistency,
} from '../packages/shared/src/content/validation';
import type { QuestionData } from '../packages/shared/src/questions/types';

// ── Load all question JSON files ─────────────────────────────────────

function loadJsonQuestions(dir: string): Array<Partial<QuestionData> & { _source: string }> {
  const questions: Array<Partial<QuestionData> & { _source: string }> = [];

  if (!fs.existsSync(dir)) return questions;

  const files = fs.readdirSync(dir).filter((f) => f.startsWith('questions-') && f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = JSON.parse(content) as Partial<QuestionData>[];
      for (const q of parsed) {
        questions.push({ ...q, _source: file });
      }
    } catch (err) {
      console.error(`Failed to parse ${file}: ${(err as Error).message}`);
    }
  }

  return questions;
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log('LC7: Batch question validation\n');

  const outputDir = path.resolve(__dirname, 'output');
  const allQuestions = loadJsonQuestions(outputDir);

  console.log(`Loaded ${allQuestions.length} questions from ${outputDir}\n`);

  if (allQuestions.length === 0) {
    console.log('No questions found. Check scripts/output/ directory.');
    return;
  }

  // ── Step 1: Individual validation ──────────────────────────────────

  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;
  const invalidQuestions: Array<{ source: string; text: string; errors: string[] }> = [];
  const warningQuestions: Array<{ source: string; text: string; warnings: string[] }> = [];

  for (const q of allQuestions) {
    const result = validateQuestion(q);
    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
      invalidQuestions.push({
        source: q._source,
        text: (q.text ?? '').slice(0, 80),
        errors: result.errors,
      });
    }
    if (result.warnings.length > 0) {
      warningCount += result.warnings.length;
      warningQuestions.push({
        source: q._source,
        text: (q.text ?? '').slice(0, 80),
        warnings: result.warnings,
      });
    }
  }

  console.log(`=== Validation Results ===`);
  console.log(`Total: ${allQuestions.length}`);
  console.log(`Valid: ${validCount} (${((validCount / allQuestions.length) * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${invalidCount}`);
  console.log(`Warnings: ${warningCount}\n`);

  // ── Step 2: Duplicate detection ────────────────────────────────────

  const allTexts = allQuestions
    .filter((q) => typeof q.text === 'string')
    .map((q) => q.text!);

  let duplicateCount = 0;
  const duplicates: Array<{ text: string; similarTo: string; similarity: number }> = [];

  for (let i = 0; i < allTexts.length; i++) {
    const others = [...allTexts.slice(0, i), ...allTexts.slice(i + 1)];
    const dup = checkDuplicateSimple(allTexts[i]!, others);
    if (dup.isDuplicate) {
      duplicateCount++;
      duplicates.push({
        text: allTexts[i]!.slice(0, 80),
        similarTo: (dup.mostSimilarQuestion ?? '').slice(0, 80),
        similarity: dup.maxSimilarity,
      });
    }
  }

  console.log(`=== Duplicate Check ===`);
  console.log(`Potential duplicates: ${duplicateCount}\n`);

  // ── Step 3: Difficulty consistency ──────────────────────────────────

  let consistentCount = 0;
  let inconsistentCount = 0;
  const inconsistencies: Array<{ text: string; current: string; suggested: string; reason: string }> = [];

  for (const q of allQuestions) {
    if (!q.text || !q.options || typeof q.correctIndex !== 'number' || !q.explanation || !q.difficulty) continue;

    const check = checkDifficultyConsistency(q as QuestionData);
    if (check.isConsistent) {
      consistentCount++;
    } else {
      inconsistentCount++;
      inconsistencies.push({
        text: q.text.slice(0, 80),
        current: q.difficulty,
        suggested: check.suggestedDifficulty ?? '?',
        reason: check.reason ?? '',
      });
    }
  }

  console.log(`=== Difficulty Consistency ===`);
  console.log(`Consistent: ${consistentCount}`);
  console.log(`Inconsistent: ${inconsistentCount}\n`);

  // ── Step 4: Branch/difficulty distribution ──────────────────────────

  const branchCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  const cellCounts: Record<string, number> = {};

  for (const q of allQuestions) {
    const b = q.branch ?? 'UNKNOWN';
    const d = q.difficulty ?? 'UNKNOWN';
    branchCounts[b] = (branchCounts[b] ?? 0) + 1;
    difficultyCounts[d] = (difficultyCounts[d] ?? 0) + 1;
    const cell = `${b}:${d}`;
    cellCounts[cell] = (cellCounts[cell] ?? 0) + 1;
  }

  console.log(`=== Distribution ===`);
  console.log(`By branch:`, branchCounts);
  console.log(`By difficulty:`, difficultyCounts);
  console.log(`\nBy cell (branch:difficulty):`);
  for (const [cell, count] of Object.entries(cellCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cell}: ${count}`);
  }

  // ── Save report ────────────────────────────────────────────────────

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: allQuestions.length,
      valid: validCount,
      invalid: invalidCount,
      warnings: warningCount,
      duplicates: duplicateCount,
      difficultyConsistent: consistentCount,
      difficultyInconsistent: inconsistentCount,
    },
    distribution: {
      byBranch: branchCounts,
      byDifficulty: difficultyCounts,
      byCell: cellCounts,
    },
    issues: {
      invalidQuestions: invalidQuestions.slice(0, 20),
      duplicates: duplicates.slice(0, 20),
      difficultyInconsistencies: inconsistencies.slice(0, 20),
      warnings: warningQuestions.slice(0, 20),
    },
  };

  const reportPath = path.join(outputDir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport saved to: ${reportPath}`);
}

main();
