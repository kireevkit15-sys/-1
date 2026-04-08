import { Difficulty, DefenseType, BattleRound } from './types';
import { DAMAGE, XP, ELO_K_FACTOR } from '../constants';

/**
 * Calculate damage dealt based on difficulty and whether the attacker answered correctly.
 * If the attacker answered incorrectly, no damage is dealt.
 * rng param allows deterministic testing of gold damage.
 */
export function calculateDamage(
  difficulty: Difficulty,
  isCorrect: boolean,
  rng?: (min: number, max: number) => number,
): number {
  if (!isCorrect) return 0;

  switch (difficulty) {
    case Difficulty.BRONZE:
      return DAMAGE.BRONZE;
    case Difficulty.SILVER:
      return DAMAGE.SILVER;
    case Difficulty.GOLD: {
      const roll = rng ?? ((min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1)));
      return roll(DAMAGE.GOLD_MIN, DAMAGE.GOLD_MAX);
    }
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
 * Returns total XP and per-branch XP breakdown.
 */
export function calculateXpGained(rounds: BattleRound[], won: boolean): Record<string, number> {
  let totalXp = 0;
  const branchXp: Record<string, number> = {};

  for (const round of rounds) {
    if (round.difficulty) {
      let roundXp = 0;
      switch (round.difficulty) {
        case Difficulty.BRONZE:
          roundXp = XP.BRONZE;
          break;
        case Difficulty.SILVER:
          roundXp = XP.SILVER;
          break;
        case Difficulty.GOLD:
          roundXp = XP.GOLD;
          break;
      }
      totalXp += roundXp;

      // Track XP per branch
      if (round.branch) {
        branchXp[round.branch] = (branchXp[round.branch] ?? 0) + roundXp;
      }
    }
  }

  if (won) {
    totalXp += XP.WIN_BONUS;
  }

  return { battle: totalXp, ...branchXp };
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
