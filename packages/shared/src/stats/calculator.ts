import { UserStatsData, ThinkerClass, StatName } from './types';

/**
 * Convert XP to level using formula: floor(sqrt(xp / 100))
 */
export function xpToLevel(xp: number): number {
  if (xp < 0) return 0;
  return Math.floor(Math.sqrt(xp / 100));
}

/**
 * Determine a player's thinker class based on their dominant stat ratios.
 */
export function determineThinkerClass(stats: UserStatsData): ThinkerClass {
  const total = stats.logic + stats.erudition + stats.strategy + stats.rhetoric + stats.intuition;

  if (total === 0) return ThinkerClass.SCHOLAR;

  const ratios = {
    logic: stats.logic / total,
    erudition: stats.erudition / total,
    strategy: stats.strategy / total,
    rhetoric: stats.rhetoric / total,
    intuition: stats.intuition / total,
  };

  // Find the dominant stat
  const entries = Object.entries(ratios) as [keyof typeof ratios, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [dominant, dominantRatio] = entries[0]!;
  const [secondary, secondaryRatio] = entries[1]!;

  // If one stat is clearly dominant (>30%), use single-class mapping
  if (dominantRatio > 0.3) {
    switch (dominant) {
      case 'strategy':
        return ThinkerClass.STRATEGIST;
      case 'logic':
        return ThinkerClass.PHILOSOPHER;
      case 'erudition':
        return ThinkerClass.SCHOLAR;
      case 'rhetoric':
        return ThinkerClass.COMMANDER;
      case 'intuition':
        return ThinkerClass.VISIONARY;
    }
  }

  // If two stats are close and both significant, use combo classes
  if (dominantRatio - secondaryRatio < 0.05) {
    // Strategy + Logic combo
    if (
      (dominant === 'strategy' && secondary === 'logic') ||
      (dominant === 'logic' && secondary === 'strategy')
    ) {
      return ThinkerClass.SAGE;
    }
  }

  // Default: balanced = SAGE
  return ThinkerClass.SAGE;
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
