/**
 * BT.14 — Unit tests for scoring (ELO, damage, defense, XP)
 *
 * Tests: ELO for 5 branches, edge cases, newbie vs veteran,
 * damage calculation, defense mechanics, XP distribution.
 */

import {
  calculateDamage,
  calculateDefenseResult,
  calculateXpGained,
  calculateRatingChange,
} from '../../dist/battle/scoring';

import { Difficulty, DefenseType, Branch } from '../../dist/battle/types';
import type { BattleRound } from '../../dist/battle/types';
import { DAMAGE, XP, ELO_K_FACTOR, ELO_DEFAULT_RATING } from '../../src/constants';

// ── Helpers ──────────────────────────────────────────────────

function makeRound(overrides: Partial<BattleRound> = {}): BattleRound {
  return {
    roundNumber: 1,
    attackerId: 'p1',
    defenderId: 'p2',
    difficulty: Difficulty.BRONZE,
    damageDealt: 10,
    pointsAwarded: 10,
    ...overrides,
  };
}

// ── calculateDamage ──────────────────────────────────────────

describe('calculateDamage', () => {
  it('should return 0 for incorrect answer regardless of difficulty', () => {
    expect(calculateDamage(Difficulty.BRONZE, false)).toBe(0);
    expect(calculateDamage(Difficulty.SILVER, false)).toBe(0);
    expect(calculateDamage(Difficulty.GOLD, false)).toBe(0);
  });

  it('BRONZE correct = 10 damage', () => {
    expect(calculateDamage(Difficulty.BRONZE, true)).toBe(DAMAGE.BRONZE);
  });

  it('SILVER correct = 20 damage', () => {
    expect(calculateDamage(Difficulty.SILVER, true)).toBe(DAMAGE.SILVER);
  });

  it('GOLD correct = 30-35 damage (random)', () => {
    const damage = calculateDamage(Difficulty.GOLD, true);
    expect(damage).toBeGreaterThanOrEqual(DAMAGE.GOLD_MIN);
    expect(damage).toBeLessThanOrEqual(DAMAGE.GOLD_MAX);
  });

  it('GOLD with deterministic rng should return exact value', () => {
    const rng = (_min: number, _max: number) => 32;
    expect(calculateDamage(Difficulty.GOLD, true, rng)).toBe(32);
  });

  it('GOLD rng receives correct min/max', () => {
    let receivedMin = 0;
    let receivedMax = 0;
    const rng = (min: number, max: number) => {
      receivedMin = min;
      receivedMax = max;
      return min;
    };

    calculateDamage(Difficulty.GOLD, true, rng);
    expect(receivedMin).toBe(DAMAGE.GOLD_MIN);
    expect(receivedMax).toBe(DAMAGE.GOLD_MAX);
  });
});

// ── calculateDefenseResult ───────────────────────────────────

describe('calculateDefenseResult', () => {
  const incomingDamage = 20;

  describe('ACCEPT', () => {
    it('should pass damage through (not reflected)', () => {
      const result = calculateDefenseResult(DefenseType.ACCEPT, true, incomingDamage);
      expect(result.damage).toBe(20);
      expect(result.reflected).toBe(false);
    });

    it('success parameter does not matter for ACCEPT', () => {
      const r1 = calculateDefenseResult(DefenseType.ACCEPT, true, incomingDamage);
      const r2 = calculateDefenseResult(DefenseType.ACCEPT, false, incomingDamage);
      expect(r1).toEqual(r2);
    });
  });

  describe('DISPUTE', () => {
    it('successful DISPUTE should reflect damage', () => {
      const result = calculateDefenseResult(DefenseType.DISPUTE, true, incomingDamage);
      expect(result.damage).toBe(20);
      expect(result.reflected).toBe(true);
    });

    it('failed DISPUTE should pass damage through', () => {
      const result = calculateDefenseResult(DefenseType.DISPUTE, false, incomingDamage);
      expect(result.damage).toBe(20);
      expect(result.reflected).toBe(false);
    });
  });

  describe('COUNTER', () => {
    it('successful COUNTER should reflect 2x damage', () => {
      const result = calculateDefenseResult(DefenseType.COUNTER, true, incomingDamage);
      expect(result.damage).toBe(40);
      expect(result.reflected).toBe(true);
    });

    it('failed COUNTER should pass normal damage through', () => {
      const result = calculateDefenseResult(DefenseType.COUNTER, false, incomingDamage);
      expect(result.damage).toBe(20);
      expect(result.reflected).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle 0 incoming damage', () => {
      const result = calculateDefenseResult(DefenseType.ACCEPT, true, 0);
      expect(result.damage).toBe(0);
    });

    it('COUNTER with 0 damage should reflect 0', () => {
      const result = calculateDefenseResult(DefenseType.COUNTER, true, 0);
      expect(result.damage).toBe(0);
      expect(result.reflected).toBe(true);
    });
  });
});

// ── calculateXpGained ────────────────────────────────────────

describe('calculateXpGained', () => {
  it('should calculate total XP from round difficulties', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: Difficulty.BRONZE }),
      makeRound({ difficulty: Difficulty.SILVER }),
      makeRound({ difficulty: Difficulty.GOLD }),
    ];

    const xp = calculateXpGained(rounds, false);
    expect(xp['battle']).toBe(XP.BRONZE + XP.SILVER + XP.GOLD);
  });

  it('should add WIN_BONUS for winners', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: Difficulty.BRONZE }),
    ];

    const xpWon = calculateXpGained(rounds, true);
    const xpLost = calculateXpGained(rounds, false);

    expect(xpWon['battle']).toBe(XP.BRONZE + XP.WIN_BONUS);
    expect(xpLost['battle']).toBe(XP.BRONZE);
    expect(xpWon['battle']! - xpLost['battle']!).toBe(XP.WIN_BONUS);
  });

  it('should track XP per branch', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.STRATEGY }),
      makeRound({ difficulty: Difficulty.SILVER, branch: Branch.STRATEGY }),
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.LOGIC }),
    ];

    const xp = calculateXpGained(rounds, false);
    expect(xp[Branch.STRATEGY]).toBe(XP.BRONZE + XP.SILVER);
    expect(xp[Branch.LOGIC]).toBe(XP.BRONZE);
  });

  it('should handle empty rounds', () => {
    const xp = calculateXpGained([], false);
    expect(xp['battle']).toBe(0);
  });

  it('should handle rounds without difficulty', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: undefined }),
    ];

    const xp = calculateXpGained(rounds, false);
    expect(xp['battle']).toBe(0);
  });

  it('should handle rounds without branch (no branch XP)', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: Difficulty.BRONZE, branch: undefined }),
    ];

    const xp = calculateXpGained(rounds, false);
    expect(xp['battle']).toBe(XP.BRONZE);
    // No branch keys should be set
    expect(xp[Branch.STRATEGY]).toBeUndefined();
  });

  it('should track all 5 branches independently', () => {
    const rounds: BattleRound[] = [
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.STRATEGY }),
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.LOGIC }),
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.ERUDITION }),
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.RHETORIC }),
      makeRound({ difficulty: Difficulty.BRONZE, branch: Branch.INTUITION }),
    ];

    const xp = calculateXpGained(rounds, false);
    expect(xp[Branch.STRATEGY]).toBe(XP.BRONZE);
    expect(xp[Branch.LOGIC]).toBe(XP.BRONZE);
    expect(xp[Branch.ERUDITION]).toBe(XP.BRONZE);
    expect(xp[Branch.RHETORIC]).toBe(XP.BRONZE);
    expect(xp[Branch.INTUITION]).toBe(XP.BRONZE);
    expect(xp['battle']).toBe(XP.BRONZE * 5);
  });
});

// ── calculateRatingChange (ELO) ──────────────────────────────

describe('calculateRatingChange (ELO)', () => {
  it('should give +16 for equal-rated win', () => {
    const change = calculateRatingChange(1000, 1000, true);
    // ELO: K * (1 - 0.5) = 32 * 0.5 = 16
    expect(change).toBe(16);
  });

  it('should give -16 for equal-rated loss', () => {
    const change = calculateRatingChange(1000, 1000, false);
    // ELO: K * (0 - 0.5) = 32 * -0.5 = -16
    expect(change).toBe(-16);
  });

  it('newbie beating veteran should gain more', () => {
    // Newbie (800) beats veteran (1200)
    const newbieGain = calculateRatingChange(800, 1200, true);
    const equalGain = calculateRatingChange(1000, 1000, true);

    expect(newbieGain).toBeGreaterThan(equalGain);
  });

  it('veteran losing to newbie should lose more', () => {
    // Veteran (1200) loses to newbie (800)
    const veteranLoss = calculateRatingChange(1200, 800, false);
    const equalLoss = calculateRatingChange(1000, 1000, false);

    expect(Math.abs(veteranLoss)).toBeGreaterThan(Math.abs(equalLoss));
  });

  it('newbie losing to veteran should lose less', () => {
    // Newbie (800) loses to veteran (1200) — expected outcome
    const newbieLoss = calculateRatingChange(800, 1200, false);
    const equalLoss = calculateRatingChange(1000, 1000, false);

    expect(Math.abs(newbieLoss)).toBeLessThan(Math.abs(equalLoss));
  });

  it('veteran beating newbie should gain less', () => {
    // Veteran (1200) beats newbie (800) — expected outcome
    const veteranGain = calculateRatingChange(1200, 800, true);
    const equalGain = calculateRatingChange(1000, 1000, true);

    expect(veteranGain).toBeLessThan(equalGain);
  });

  it('win should always return non-negative change', () => {
    expect(calculateRatingChange(2000, 800, true)).toBeGreaterThanOrEqual(0);
    expect(calculateRatingChange(800, 2000, true)).toBeGreaterThan(0);
    expect(calculateRatingChange(1000, 1000, true)).toBeGreaterThan(0);
  });

  it('loss should always return non-positive change', () => {
    expect(calculateRatingChange(2000, 800, false)).toBeLessThanOrEqual(0);
    // 800 vs 2000: expected score ≈ 0.001, loss rounds to -0 (edge case of ELO)
    expect(calculateRatingChange(800, 2000, false)).toBeLessThanOrEqual(0);
    expect(calculateRatingChange(1000, 1000, false)).toBeLessThan(0);
  });

  it('rating changes should be symmetric (winner gain ≈ loser loss for same pair)', () => {
    const p1Win = calculateRatingChange(1000, 1000, true);
    const p2Loss = calculateRatingChange(1000, 1000, false);

    // They should be exact opposites for equal ratings
    expect(p1Win + p2Loss).toBe(0);
  });

  it('should handle extreme rating differences', () => {
    // 3000 vs 500 — massive difference, expected score ≈ 1, so gain ≈ 0
    const gain = calculateRatingChange(3000, 500, true);
    expect(gain).toBeGreaterThanOrEqual(0);
    expect(gain).toBeLessThanOrEqual(ELO_K_FACTOR);

    // High-rated player losing to low-rated: big penalty
    const loss = calculateRatingChange(3000, 500, false);
    expect(loss).toBeLessThanOrEqual(0);
  });

  it('should use K-factor of 32', () => {
    // Maximum possible change is K when expectedScore ≈ 0
    const maxGain = calculateRatingChange(500, 3000, true);
    expect(maxGain).toBeLessThanOrEqual(ELO_K_FACTOR);
    expect(maxGain).toBeGreaterThan(ELO_K_FACTOR - 2); // Should be close to K
  });

  it('ELO should work the same for each branch context', () => {
    // ELO calculation is the same function regardless of branch;
    // verify by calling with various "branch-like" ratings
    const strategyChange = calculateRatingChange(1100, 900, true);
    const logicChange = calculateRatingChange(1100, 900, true);

    // Same inputs → same output (deterministic)
    expect(strategyChange).toBe(logicChange);
  });
});
