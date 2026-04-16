/**
 * L22.1 — Determination algorithm
 *
 * Analyzes 5 situation answers to derive:
 * - startZone: strongest branch (learning starts here)
 * - painPoint: weakest branch (will be gradually introduced)
 * - deliveryStyle: analytical / practical / philosophical
 * - branchScores: normalized 0-1 scores per branch
 */

import type { DeterminationAnswer, DeterminationResult, LearningBranch, DeliveryStyle } from './types';

// ── Branch mapping ───────────────────────────────────────────────────

const BRANCHES: LearningBranch[] = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];

/**
 * Option scoring weights:
 * Option 0 = strongest alignment (3 pts)
 * Option 1 = moderate alignment (2 pts)
 * Option 2 = weak alignment (1 pt)
 * Option 3 = no alignment (0 pts)
 */
const OPTION_WEIGHTS = [3, 2, 1, 0] as const;

/**
 * Cross-branch influence matrix.
 * When a user shows strength in one branch, related branches get a bonus.
 * E.g., strong STRATEGY correlates with some LOGIC ability.
 */
const CROSS_BRANCH_BONUS: Record<LearningBranch, Partial<Record<LearningBranch, number>>> = {
  STRATEGY: { LOGIC: 0.15, RHETORIC: 0.1 },
  LOGIC: { STRATEGY: 0.1, ERUDITION: 0.1 },
  ERUDITION: { LOGIC: 0.1, INTUITION: 0.1 },
  RHETORIC: { STRATEGY: 0.1, INTUITION: 0.15 },
  INTUITION: { RHETORIC: 0.1, ERUDITION: 0.1 },
};

// ── Delivery style thresholds ────────────────────────────────────────

/**
 * Delivery style is derived from answer patterns:
 * - Analytical: prefers structured, data-driven options (low option indices)
 * - Practical: prefers action-oriented, scenario-based options (mid option indices)
 * - Philosophical: prefers reflective, open-ended options (high option indices)
 *
 * We also consider answer variance — consistent answerers get a stronger signal.
 */
function deriveDeliveryStyle(answers: DeterminationAnswer[]): DeliveryStyle {
  if (answers.length === 0) return 'practical';

  const avgOption = answers.reduce((s, a) => s + a.chosenOption, 0) / answers.length;

  // Calculate variance for confidence in style assignment
  const variance =
    answers.reduce((s, a) => s + (a.chosenOption - avgOption) ** 2, 0) / answers.length;

  // High variance = mixed signals → default to practical
  if (variance > 1.5) return 'practical';

  if (avgOption < 1.2) return 'analytical';
  if (avgOption > 2.3) return 'philosophical';
  return 'practical';
}

// ── Main algorithm ───────────────────────────────────────────────────

export function analyzeDetermination(answers: DeterminationAnswer[]): DeterminationResult {
  // Initialize raw scores
  const rawScores: Record<LearningBranch, number> = {
    STRATEGY: 0,
    LOGIC: 0,
    ERUDITION: 0,
    RHETORIC: 0,
    INTUITION: 0,
  };

  // Score each answer
  for (const answer of answers) {
    const branchIdx = answer.situationIndex - 1;
    if (branchIdx < 0 || branchIdx >= BRANCHES.length) continue;

    const branch = BRANCHES[branchIdx]!;
    const optionIdx = Math.max(0, Math.min(3, answer.chosenOption));
    const weight = OPTION_WEIGHTS[optionIdx]!;

    rawScores[branch] += weight;
  }

  // Apply cross-branch bonuses
  const adjustedScores = { ...rawScores };
  for (const branch of BRANCHES) {
    const bonuses = CROSS_BRANCH_BONUS[branch];
    const score = rawScores[branch];
    if (score > 0) {
      for (const [target, bonus] of Object.entries(bonuses) as Array<[LearningBranch, number]>) {
        adjustedScores[target] += score * bonus;
      }
    }
  }

  // Normalize to 0-1 range
  const maxPossible = 3; // max score per branch = 3 (one situation, option 0)
  const branchScores: Record<LearningBranch, number> = {
    STRATEGY: 0,
    LOGIC: 0,
    ERUDITION: 0,
    RHETORIC: 0,
    INTUITION: 0,
  };

  for (const branch of BRANCHES) {
    branchScores[branch] = Math.min(1, adjustedScores[branch] / maxPossible);
  }

  // Sort by score to find strongest and weakest
  const sorted = BRANCHES.slice().sort(
    (a, b) => branchScores[b] - branchScores[a],
  );

  const startZone = sorted[0]!;
  const painPoint = sorted[sorted.length - 1]!;

  // Delivery style from answer patterns
  const deliveryStyle = deriveDeliveryStyle(answers);

  return { startZone, painPoint, deliveryStyle, branchScores };
}
