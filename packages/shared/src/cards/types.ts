import { Branch } from '../questions/types';

export { Branch };

// ── Card rarity ──
export enum CardRarity {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

// ── Card type ──
export enum CardType {
  ATTACK = 'ATTACK',       // Deals damage, requires question
  DEFENSE = 'DEFENSE',     // Blocks damage, requires question
  TACTIC = 'TACTIC',       // Instant effect, no question needed
  BUFF = 'BUFF',           // Persistent effect for rest of battle
}

// ── Card effect triggers ──
export enum CardEffectTrigger {
  ON_CORRECT_FAST = 'ON_CORRECT_FAST',       // Answered correctly in < 10 sec
  ON_CORRECT = 'ON_CORRECT',                 // Answered correctly (any speed)
  ON_OPPONENT_ATTACKED = 'ON_OPPONENT_ATTACKED', // If opponent attacked last turn
  ON_PLAY = 'ON_PLAY',                       // When card is played (tactics/buffs)
  PASSIVE = 'PASSIVE',                       // Always active while in play
}

// ── Card effect types ──
export enum CardEffectType {
  DAMAGE_MULTIPLY = 'DAMAGE_MULTIPLY',       // Multiply damage by factor
  BONUS_DAMAGE = 'BONUS_DAMAGE',             // Add flat damage
  HEAL = 'HEAL',                             // Restore HP
  BLOCK = 'BLOCK',                           // Block incoming damage
  ENERGY_REDUCE = 'ENERGY_REDUCE',           // Next card costs less energy
  REMOVE_WRONG_OPTION = 'REMOVE_WRONG_OPTION', // Remove 1 wrong answer option
  EXTRA_TIME = 'EXTRA_TIME',                 // Add seconds to timer
  REDUCE_OPPONENT_TIME = 'REDUCE_OPPONENT_TIME', // Opponent gets less time
  REVEAL_OPPONENT_CARD = 'REVEAL_OPPONENT_CARD', // See opponent's next card
  EXTRA_OPTIONS = 'EXTRA_OPTIONS',           // Opponent sees 6 options instead of 4
  FULL_BLOCK_NEXT = 'FULL_BLOCK_NEXT',       // Block next attack completely
}

// ── Card definition (template) ──
export interface CardDefinition {
  id: string;
  name: string;                  // e.g. "Ошибка выжившего"
  description: string;           // Short concept description
  branch: Branch;
  type: CardType;
  rarity: CardRarity;
  energyCost: number;            // 1-4
  attackDamage: number;          // Base damage (0 for non-attack)
  defensePower: number;          // Base defense (0 for non-defense)
  effect?: {
    trigger: CardEffectTrigger;
    type: CardEffectType;
    value: number;               // Multiplier, flat amount, seconds, etc.
    description: string;         // Human-readable: "Ответ < 10 сек → урон ×1.5"
  };
}

// ── Player's card instance (owned, with level) ──
export interface PlayerCard {
  id: string;                    // Instance ID
  definitionId: string;          // Links to CardDefinition
  definition: CardDefinition;
  level: number;                 // 1-5, affects damage/defense scaling
  xp: number;                   // XP toward next level
  xpToNextLevel: number;
}

// ── Card in hand during battle ──
export interface HandCard {
  instanceId: string;            // PlayerCard.id
  definition: CardDefinition;
  level: number;
  // Computed values (scaled by level)
  effectiveDamage: number;
  effectiveDefense: number;
  effectiveEnergyCost: number;
}

// ── Battle-specific types ──
export enum CardBattlePhase {
  PREPARING = 'PREPARING',       // Deck selection
  VS_SCREEN = 'VS_SCREEN',       // VS animation
  PLAYER_TURN = 'PLAYER_TURN',   // Player selects a card
  QUESTION = 'QUESTION',         // Player answers question for played card
  CARD_RESULT = 'CARD_RESULT',   // Show result of player's card
  BOT_TURN = 'BOT_TURN',         // Bot plays a card (auto)
  BOT_RESULT = 'BOT_RESULT',     // Show bot's play result + explanation
  TURN_SUMMARY = 'TURN_SUMMARY', // End of turn scores
  FINAL_RESULT = 'FINAL_RESULT', // Battle over
}

export interface CardBattlePlayer {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  hand: HandCard[];
  deckSize: number;              // Cards remaining in deck
  score: number;
  buffs: ActiveBuff[];
}

export interface ActiveBuff {
  effectType: CardEffectType;
  value: number;
  turnsRemaining: number;        // -1 = permanent
  sourceName: string;            // Which card created this
}

export interface CardBattleTurn {
  turnNumber: number;
  playerCardPlayed?: HandCard;
  playerCorrect?: boolean;
  playerAnswerTime?: number;     // seconds
  playerDamageDealt: number;
  playerEffectTriggered?: string;
  botCardPlayed?: HandCard;
  botCorrect?: boolean;
  botDamageDealt: number;
  botEffectTriggered?: string;
}

export interface CardBattleState {
  id: string;
  phase: CardBattlePhase;
  player: CardBattlePlayer;
  bot: CardBattlePlayer;
  currentTurn: number;
  maxTurns: number;              // 5-7
  turns: CardBattleTurn[];
  selectedCard?: HandCard;
  questionTimeLimit: number;     // seconds per question
  startedAt?: number;
  endedAt?: number;
}

export enum BotPersonality {
  APPRENTICE = 'APPRENTICE',     // Ученик — cautious, low accuracy
  PHILOSOPHER = 'PHILOSOPHER',   // Философ — heavy cards, slow
  WARLORD = 'WARLORD',          // Полководец — aggressive, fast cheap cards
  SAGE = 'SAGE',                 // Мудрец — balanced, uses tactics
  ARCHON = 'ARCHON',            // Архонт — almost never wrong, gold cards
}

export interface BotConfig {
  personality: BotPersonality;
  accuracy: number;              // 0.0-1.0 probability of correct answer
  responseTimeRange: [number, number]; // [min, max] seconds
  preferredCardTypes: CardType[];
  energyStrategy: 'aggressive' | 'balanced' | 'conservative';
}

export interface CardBattleResult {
  winnerId: string | null;
  playerScore: number;
  botScore: number;
  playerHpRemaining: number;
  botHpRemaining: number;
  xpGained: number;
  ratingChange: number;
  cardReward?: CardDefinition;   // Card won (if any)
  turnsPlayed: number;
}
