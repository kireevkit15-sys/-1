import { BotConfig, BotPersonality, CardType } from './types';

// ── Battle constants ──
export const CARD_BATTLE = {
  MAX_HP: 100,
  STARTING_ENERGY: 2,
  ENERGY_PER_TURN: 1,
  MAX_ENERGY: 5,
  STARTING_HAND_SIZE: 4,
  DRAW_PER_TURN: 1,
  MIN_DECK_SIZE: 8,
  MAX_DECK_SIZE: 15,
  DEFAULT_DECK_SIZE: 12,
  MAX_TURNS: 6,
  QUESTION_TIME_LIMIT: 30,
} as const;

// ── Damage scaling by card level ──
export const LEVEL_SCALE = {
  1: 1.0,
  2: 1.15,
  3: 1.3,
  4: 1.5,
  5: 1.75,
} as const;

// ── Speed bonus: linear from 0 (at 30s) to max (at instant) ──
export const SPEED_BONUS = {
  MAX_BONUS: 8,                  // Max extra damage for instant answer
  TIME_LIMIT: 30,                // Answer must be within this to get any bonus
} as const;

// ── Card XP to level up ──
export const CARD_LEVEL_XP = {
  1: 0,
  2: 50,
  3: 150,
  4: 350,
  5: 700,
} as const;

// ── Card reward chances after battle ──
export const CARD_REWARD_CHANCE = {
  LOSS: { bronze: 0.15, silver: 0.03, gold: 0.0 },
  WIN: { bronze: 0.50, silver: 0.15, gold: 0.03 },
  PERFECT: { bronze: 0.30, silver: 0.40, gold: 0.15 },
} as const;

// ── Bot configurations ──
export const BOT_CONFIGS: Record<BotPersonality, BotConfig> = {
  [BotPersonality.APPRENTICE]: {
    personality: BotPersonality.APPRENTICE,
    accuracy: 0.40,
    responseTimeRange: [15, 25],
    preferredCardTypes: [CardType.ATTACK],
    energyStrategy: 'aggressive',
  },
  [BotPersonality.PHILOSOPHER]: {
    personality: BotPersonality.PHILOSOPHER,
    accuracy: 0.60,
    responseTimeRange: [10, 18],
    preferredCardTypes: [CardType.ATTACK, CardType.BUFF],
    energyStrategy: 'conservative',
  },
  [BotPersonality.WARLORD]: {
    personality: BotPersonality.WARLORD,
    accuracy: 0.65,
    responseTimeRange: [5, 12],
    preferredCardTypes: [CardType.ATTACK, CardType.ATTACK],
    energyStrategy: 'aggressive',
  },
  [BotPersonality.SAGE]: {
    personality: BotPersonality.SAGE,
    accuracy: 0.75,
    responseTimeRange: [6, 14],
    preferredCardTypes: [CardType.ATTACK, CardType.TACTIC, CardType.DEFENSE],
    energyStrategy: 'balanced',
  },
  [BotPersonality.ARCHON]: {
    personality: BotPersonality.ARCHON,
    accuracy: 0.90,
    responseTimeRange: [3, 8],
    preferredCardTypes: [CardType.ATTACK, CardType.BUFF, CardType.TACTIC],
    energyStrategy: 'balanced',
  },
};

// ── Craft recipes ──
export const CRAFT_RECIPES = {
  BRONZE_TO_SILVER: 3,  // 3 bronze of same card → 1 silver
  SILVER_TO_GOLD: 3,    // 3 silver of same card → 1 gold
} as const;
