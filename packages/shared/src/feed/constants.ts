// ── Feed Constants ──────────────────────────────

/** Max active campaigns at once */
export const MAX_ACTIVE_CAMPAIGNS = 2;

/** Cards per day target */
export const DAILY_CARDS_TARGET = 25;
export const DAILY_CARDS_MIN = 10; // Minimum for feed streak

/** Card distribution ratio (out of 10) */
export const CARD_RATIO = {
  INSIGHT: 3,       // 30% — passive learning
  CHALLENGE: 2,     // 20% — active quiz
  CASE: 1,          // 10% — deep analysis
  SPARRING: 1,      // 10% — competitive
  FORGE: 1,         // 10% — spaced repetition
  WISDOM: 1,        // 10% — inspiration
  ARENA: 1,         // 10% — battle CTA
} as const;

/** XP rewards per card type */
export const FEED_XP = {
  INSIGHT_VIEWED: 5,
  CHALLENGE_CORRECT: 15,
  CHALLENGE_WRONG: 3,
  CASE_COMPLETED: 20,
  SPARRING_WIN: 25,
  SPARRING_LOSS: 5,
  FORGE_CORRECT: 20,
  FORGE_WRONG: 3,
  WISDOM_VIEWED: 3,
} as const;

/** Spaced Repetition intervals (in days) */
export const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;

/** Adaptive difficulty thresholds */
export const ADAPTIVE = {
  /** Below this % correct → easier content */
  EASY_THRESHOLD: 0.6,
  /** Above this % correct → harder content */
  HARD_THRESHOLD: 0.8,
} as const;

/** Insert ARENA card every N cards */
export const ARENA_INTERVAL = 6;

/** Insert WISDOM card every N cards */
export const WISDOM_INTERVAL = 4;

/** Warrior Rank XP thresholds */
export const RANK_THRESHOLDS = {
  NOVICE: 0,
  WARRIOR: 500,
  GLADIATOR: 2000,
  STRATEGIST: 5000,
  SPARTAN: 15000,
} as const;

/** Feed streak fire threshold */
export const FIRE_STREAK_THRESHOLD = 7;

/** Social stats shown on challenge cards */
export const SHOW_COMMUNITY_STATS = true;

/** Max forge (SRS) cards per day */
export const MAX_DAILY_FORGE_CARDS = 5;

/** Cards cache TTL in Redis (24 hours) */
export const FEED_CACHE_TTL = 86400;
