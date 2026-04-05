// === HP & Rounds ===
export const MAX_HP = 100;
export const ROUNDS_PER_BATTLE = 5;
export const ROUND_TIME_LIMIT = 60; // seconds
export const SPARRING_ROUNDS = 3;

// === Damage per difficulty ===
export const DAMAGE = {
  BRONZE: 10,
  SILVER: 20,
  GOLD_MIN: 30,
  GOLD_MAX: 35,
} as const;

// === XP per difficulty ===
export const XP = {
  BRONZE: 10,
  SILVER: 25,
  GOLD: 50,
  WIN_BONUS: 100,
} as const;

// === Daily limits ===
export const FREE_DAILY_DIALOGUES = 1;
export const FREE_DAILY_BATTLES = 5;
export const WARMUP_QUESTIONS = 5;

// === Streak ===
export const STREAK_RESET_HOURS = 36;

// === ELO ===
export const ELO_K_FACTOR = 32;
export const ELO_DEFAULT_RATING = 1000;
