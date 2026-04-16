// ── Learning System Constants ────────────────────────────────────────
// Shared between frontend and backend — no Prisma dependency.

import type { LevelName } from './types';

// ── Level progression ────────────────────────────────────────────────

/** Levels in order of progression */
export const LEVEL_ORDER: readonly LevelName[] = [
  'SLEEPING',
  'AWAKENED',
  'OBSERVER',
  'WARRIOR',
  'STRATEGIST',
  'MASTER',
] as const;

/** Russian display names for each level */
export const LEVEL_DISPLAY_NAMES: Record<LevelName, string> = {
  SLEEPING: 'Спящий',
  AWAKENED: 'Пробудившийся',
  OBSERVER: 'Наблюдатель',
  WARRIOR: 'Воин',
  STRATEGIST: 'Стратег',
  MASTER: 'Мастер',
};

// ── Barrier (level gate exam) ────────────────────────────────────────

/** Minimum score to pass a barrier */
export const BARRIER_PASS_THRESHOLD = 0.6;

/** Weight of each barrier stage in the final score */
export const BARRIER_WEIGHTS: Readonly<Record<'recall' | 'connect' | 'apply' | 'defend', number>> = {
  recall: 0.20,
  connect: 0.25,
  apply: 0.30,
  defend: 0.25,
};

// ── Path progression ─────────────────────────────────────────────────

/** Number of learning days per level */
export const DAYS_PER_LEVEL = 5;

/** Maximum total days in the learning path */
export const MAX_PATH_DAYS = 30;

// ── Mastery & SRS ────────────────────────────────────────────────────

/** Mastery delta per explanation grade */
export const MASTERY_DELTAS: Readonly<Record<'understood' | 'partial' | 'missed', number>> = {
  understood: 0.15,
  partial: 0.05,
  missed: 0,
};

/** Spaced repetition intervals in days */
export const SRS_INTERVALS: readonly number[] = [1, 3, 7, 14, 30] as const;

// ── Branches ─────────────────────────────────────────────────────────

/** Branch identifiers with Russian display names */
export const BRANCH_NAMES: Readonly<Record<string, string>> = {
  STRATEGY: 'Стратегия',
  LOGIC: 'Логика',
  ERUDITION: 'Эрудиция',
  RHETORIC: 'Риторика',
  INTUITION: 'Интуиция',
};
