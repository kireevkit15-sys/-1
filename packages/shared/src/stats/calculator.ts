import { UserStatsData, ThinkerClass, StatName } from './types';

/**
 * Convert XP to level using formula: floor(sqrt(xp / 100))
 */
export function xpToLevel(xp: number): number {
  if (xp < 0) return 0;
  return Math.floor(Math.sqrt(xp / 100));
}

type BranchKey = 'strategy' | 'logic' | 'erudition' | 'rhetoric' | 'intuition';

const BRANCH_CLASS_MAP: Record<BranchKey, ThinkerClass> = {
  strategy: ThinkerClass.STRATEGIST,
  logic: ThinkerClass.PHILOSOPHER,
  erudition: ThinkerClass.SCHOLAR,
  rhetoric: ThinkerClass.COMMANDER,
  intuition: ThinkerClass.VISIONARY,
};

const HYBRID_CLASS_MAP: Record<string, ThinkerClass> = {
  'logic+strategy': ThinkerClass.SAGE,
  'rhetoric+strategy': ThinkerClass.WARLORD,
  'erudition+logic': ThinkerClass.SCIENTIST,
  'intuition+logic': ThinkerClass.ANALYST,
  'erudition+intuition': ThinkerClass.ORACLE,
  'intuition+rhetoric': ThinkerClass.DIPLOMAT,
};

/**
 * Determine a player's thinker class based on their dominant branch.
 *
 * Algorithm:
 * 1. If all stats are 0 → POLYMATH (no data yet)
 * 2. If all branches within 5% of each other → POLYMATH (balanced)
 * 3. If dominant branch > 30% AND lead over secondary ≥ 5% → base class (1:1 with branch)
 * 4. If top-2 branches are close (diff < 5%) → hybrid class (combo of two branches)
 * 5. Fallback → base class of dominant branch
 */
export function determineThinkerClass(stats: UserStatsData): ThinkerClass {
  const total = stats.logic + stats.erudition + stats.strategy + stats.rhetoric + stats.intuition;

  if (total === 0) return ThinkerClass.POLYMATH;

  const ratios = {
    logic: stats.logic / total,
    erudition: stats.erudition / total,
    strategy: stats.strategy / total,
    rhetoric: stats.rhetoric / total,
    intuition: stats.intuition / total,
  };

  const entries = Object.entries(ratios) as [BranchKey, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [dominant, dominantRatio] = entries[0]!;
  const [secondary, secondaryRatio] = entries[1]!;
  const [, lowestRatio] = entries[4]!;

  // All branches balanced (spread < 5%)
  if (dominantRatio - lowestRatio < 0.05) {
    return ThinkerClass.POLYMATH;
  }

  // Clear dominant branch (lead ≥ 5% over secondary)
  if (dominantRatio - secondaryRatio >= 0.05) {
    return BRANCH_CLASS_MAP[dominant];
  }

  // Top-2 branches close → hybrid class
  const hybridKey = [dominant, secondary].sort().join('+');
  const hybrid = HYBRID_CLASS_MAP[hybridKey];
  if (hybrid) {
    return hybrid;
  }

  // Remaining combos without a specific hybrid → base class of dominant
  return BRANCH_CLASS_MAP[dominant];
}

/**
 * Calculate per-branch levels and overall level (average of 5 branches).
 */
export function getBranchLevels(stats: UserStatsData): {
  logic: number;
  erudition: number;
  strategy: number;
  rhetoric: number;
  intuition: number;
  overall: number;
} {
  const logic = xpToLevel(stats.logic);
  const erudition = xpToLevel(stats.erudition);
  const strategy = xpToLevel(stats.strategy);
  const rhetoric = xpToLevel(stats.rhetoric);
  const intuition = xpToLevel(stats.intuition);
  const overall = Math.floor((logic + erudition + strategy + rhetoric + intuition) / 5);
  return { logic, erudition, strategy, rhetoric, intuition, overall };
}

/**
 * XP needed to reach next level for a given XP amount.
 */
export function xpToNextLevel(xp: number): { current: number; required: number; level: number } {
  const level = xpToLevel(xp);
  const nextLevel = level + 1;
  const xpForCurrentLevel = level * level * 100;
  const xpForNextLevel = nextLevel * nextLevel * 100;
  return {
    current: xp - xpForCurrentLevel,
    required: xpForNextLevel - xpForCurrentLevel,
    level,
  };
}

/**
 * Get stats formatted for a radar chart.
 */
export function getStatsRadar(stats: UserStatsData): { name: string; value: number; level: number }[] {
  return [
    { name: StatName.LOGIC, value: stats.logic, level: xpToLevel(stats.logic) },
    { name: StatName.ERUDITION, value: stats.erudition, level: xpToLevel(stats.erudition) },
    { name: StatName.STRATEGY, value: stats.strategy, level: xpToLevel(stats.strategy) },
    { name: StatName.RHETORIC, value: stats.rhetoric, level: xpToLevel(stats.rhetoric) },
    { name: StatName.INTUITION, value: stats.intuition, level: xpToLevel(stats.intuition) },
  ];
}
