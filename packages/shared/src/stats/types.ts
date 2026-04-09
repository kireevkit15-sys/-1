export enum StatName {
  LOGIC = 'LOGIC',
  ERUDITION = 'ERUDITION',
  STRATEGY = 'STRATEGY',
  RHETORIC = 'RHETORIC',
  INTUITION = 'INTUITION',
}

export interface UserStatsData {
  logic: number;
  erudition: number;
  strategy: number;
  rhetoric: number;
  intuition: number;
}

export enum ThinkerClass {
  // Base classes (1:1 with branches)
  STRATEGIST = 'STRATEGIST',   // Strategy dominant
  PHILOSOPHER = 'PHILOSOPHER', // Logic dominant
  SCHOLAR = 'SCHOLAR',         // Erudition dominant
  COMMANDER = 'COMMANDER',     // Rhetoric dominant
  VISIONARY = 'VISIONARY',     // Intuition dominant

  // Hybrid classes (top-2 branches close)
  SAGE = 'SAGE',               // Strategy + Logic
  WARLORD = 'WARLORD',         // Strategy + Rhetoric
  SCIENTIST = 'SCIENTIST',     // Logic + Erudition
  ANALYST = 'ANALYST',         // Logic + Intuition
  ORACLE = 'ORACLE',           // Erudition + Intuition
  DIPLOMAT = 'DIPLOMAT',       // Rhetoric + Intuition

  // Balanced
  POLYMATH = 'POLYMATH',       // All branches balanced
}
