import {
  xpToLevel,
  xpToNextLevel,
  getBranchLevels,
  determineThinkerClass,
  getStatsRadar,
} from '../../src/stats/calculator';
import { ThinkerClass } from '../../src/stats/types';

describe('xpToLevel', () => {
  it('returns 0 for 0 XP', () => {
    expect(xpToLevel(0)).toBe(0);
  });

  it('returns 0 for negative XP', () => {
    expect(xpToLevel(-50)).toBe(0);
  });

  it('returns 1 at 100 XP', () => {
    expect(xpToLevel(100)).toBe(1);
  });

  it('returns 3 at 900 XP', () => {
    expect(xpToLevel(900)).toBe(3);
  });

  it('returns 10 at 10000 XP', () => {
    expect(xpToLevel(10000)).toBe(10);
  });

  it('returns level correctly between thresholds', () => {
    // 399 XP: sqrt(399/100) = sqrt(3.99) ≈ 1.99 → floor = 1
    expect(xpToLevel(399)).toBe(1);
    // 400 XP: sqrt(400/100) = sqrt(4) = 2 → floor = 2
    expect(xpToLevel(400)).toBe(2);
  });
});

describe('xpToNextLevel', () => {
  it('returns correct progress at 0 XP', () => {
    const result = xpToNextLevel(0);
    expect(result.level).toBe(0);
    expect(result.current).toBe(0);
    expect(result.required).toBe(100); // need 100 XP for level 1
  });

  it('returns correct progress mid-level', () => {
    const result = xpToNextLevel(150);
    expect(result.level).toBe(1);
    expect(result.current).toBe(50); // 150 - 100 = 50
    expect(result.required).toBe(300); // level 2 at 400, level 1 at 100 → 300
  });

  it('returns correct progress at level boundary', () => {
    const result = xpToNextLevel(400);
    expect(result.level).toBe(2);
    expect(result.current).toBe(0);
    expect(result.required).toBe(500); // level 3 at 900, level 2 at 400 → 500
  });
});

describe('getBranchLevels', () => {
  it('returns all zeros for zero XP', () => {
    const result = getBranchLevels({
      logic: 0, erudition: 0, strategy: 0, rhetoric: 0, intuition: 0,
    });
    expect(result).toEqual({
      logic: 0, erudition: 0, strategy: 0, rhetoric: 0, intuition: 0,
      overall: 0,
    });
  });

  it('calculates per-branch levels correctly', () => {
    const result = getBranchLevels({
      logic: 100,     // level 1
      erudition: 400, // level 2
      strategy: 900,  // level 3
      rhetoric: 0,    // level 0
      intuition: 0,   // level 0
    });
    expect(result.logic).toBe(1);
    expect(result.erudition).toBe(2);
    expect(result.strategy).toBe(3);
    expect(result.rhetoric).toBe(0);
    expect(result.intuition).toBe(0);
  });

  it('overall is floor of average of 5 branch levels', () => {
    const result = getBranchLevels({
      logic: 100,     // level 1
      erudition: 400, // level 2
      strategy: 900,  // level 3
      rhetoric: 0,    // level 0
      intuition: 0,   // level 0
    });
    // average = (1+2+3+0+0)/5 = 1.2, floor = 1
    expect(result.overall).toBe(1);
  });

  it('overall rounds down', () => {
    const result = getBranchLevels({
      logic: 10000,     // level 10
      erudition: 10000, // level 10
      strategy: 10000,  // level 10
      rhetoric: 10000,  // level 10
      intuition: 0,     // level 0
    });
    // average = (10+10+10+10+0)/5 = 8
    expect(result.overall).toBe(8);
  });
});

describe('determineThinkerClass', () => {
  it('returns SCHOLAR when all stats are 0', () => {
    expect(determineThinkerClass({
      logic: 0, erudition: 0, strategy: 0, rhetoric: 0, intuition: 0,
    })).toBe(ThinkerClass.SCHOLAR);
  });

  it('returns STRATEGIST when strategy dominates', () => {
    expect(determineThinkerClass({
      logic: 10, erudition: 10, strategy: 100, rhetoric: 10, intuition: 10,
    })).toBe(ThinkerClass.STRATEGIST);
  });

  it('returns PHILOSOPHER when logic dominates', () => {
    expect(determineThinkerClass({
      logic: 100, erudition: 10, strategy: 10, rhetoric: 10, intuition: 10,
    })).toBe(ThinkerClass.PHILOSOPHER);
  });

  it('returns SCHOLAR when erudition dominates', () => {
    expect(determineThinkerClass({
      logic: 10, erudition: 100, strategy: 10, rhetoric: 10, intuition: 10,
    })).toBe(ThinkerClass.SCHOLAR);
  });

  it('returns COMMANDER when rhetoric dominates', () => {
    expect(determineThinkerClass({
      logic: 10, erudition: 10, strategy: 10, rhetoric: 100, intuition: 10,
    })).toBe(ThinkerClass.COMMANDER);
  });

  it('returns VISIONARY when intuition dominates', () => {
    expect(determineThinkerClass({
      logic: 10, erudition: 10, strategy: 10, rhetoric: 10, intuition: 100,
    })).toBe(ThinkerClass.VISIONARY);
  });

  it('returns SAGE when strategy and logic are close and no stat > 30%', () => {
    // Both at ~27%, none >30%, and diff < 5% → SAGE
    expect(determineThinkerClass({
      logic: 60, erudition: 50, strategy: 60, rhetoric: 25, intuition: 25,
    })).toBe(ThinkerClass.SAGE);
  });

  it('returns SAGE when balanced', () => {
    expect(determineThinkerClass({
      logic: 20, erudition: 20, strategy: 20, rhetoric: 20, intuition: 20,
    })).toBe(ThinkerClass.SAGE);
  });
});

describe('getStatsRadar', () => {
  it('returns 5 entries with levels', () => {
    const result = getStatsRadar({
      logic: 100, erudition: 400, strategy: 0, rhetoric: 900, intuition: 10000,
    });
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ name: 'LOGIC', value: 100, level: 1 });
    expect(result[4]).toEqual({ name: 'INTUITION', value: 10000, level: 10 });
  });
});
