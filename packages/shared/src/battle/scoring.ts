import { Difficulty, DefenseType, BattleRound } from './types';
import { DAMAGE, XP, ELO_K_FACTOR } from '../constants';

/**
 * Calculate damage dealt based on difficulty and whether the attacker answered correctly.
 * If the attacker answered incorrectly, no damage is dealt.
 */
export function calculateDamage(difficulty: Difficulty, isCorrect: boolean): number {
  if (!isCorrect) return 0;

  switch (difficulty) {
    case Difficulty.BRONZE:
      return DAMAGE.BRONZE;
    case Difficulty.SILVER:
      return DAMAGE.SILVER;
    case Difficulty.GOLD:
      // Random between GOLD_MIN and GOLD_MAX inclusive
      return DAMAGE.GOLD_MIN + Math.floor(Math.random() * (DAMAGE.GOLD_MAX - DAMAGE.GOLD_MIN + 1));
    default:
      return 0;
  }
}

/**
 * Calculate the result of a defense action.
 * - ACCEPT: damage passes through as-is.
 * - DISPUTE success: damage is reflected back to attacker.
 * - DISPUTE fail: damage passes through.
 * - COUNTER success: double damage reflected back to attacker.
 * - COUNTER fail: damage passes through.
 */
export function calculateDefenseResult(
  defenseType: DefenseType,
  success: boolean,
  incomingDamage: number,
): { damage: number; reflected: boolean } {
  switch (defenseType) {
    case DefenseType.ACCEPT:
      return { damage: incomingDamage, reflected: false };

    case DefenseType.DISPUTE:
      if (success) {
        return { damage: incomingDamage, reflected: true };
      }
      return { damage: incomingDamage, reflected: false };

    case DefenseType.COUNTER:
      if (success) {
        return { damage: incomingDamage * 2, reflected: true };
      }
      return { damage: incomingDamage, reflected: false };

    default:
      return { damage: incomingDamage, reflected: false };
  }
}

/**
 * Calculate XP gained from a battle based on rounds played and whether the player won.
 */
export function calculateXpGained(rounds: BattleRound[], won: boolean): Record<string, number> {
  let totalXp = 0;

  for (const round of rounds) {
    if (round.difficulty) {
      switch (round.difficulty) {
        case Difficulty.BRONZE:
          totalXp += XP.BRONZE;
          break;
        case Difficulty.SILVER:
          totalXp += XP.SILVER;
          break;
        case Difficulty.GOLD:
          totalXp += XP.GOLD;
          break;
      }
    }
  }

  if (won) {
    totalXp += XP.WIN_BONUS;
  }

  return { battle: totalXp };
}

/**
 * Calculate ELO rating change.
 * Uses standard ELO formula with K-factor of 32.
 */
export function calculateRatingChange(
  playerRating: number,
  opponentRating: number,
  won: boolean,
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(ELO_K_FACTOR * (actualScore - expectedScore));
}
