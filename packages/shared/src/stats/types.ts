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
  STRATEGIST = 'STRATEGIST',
  PHILOSOPHER = 'PHILOSOPHER',
  SCHOLAR = 'SCHOLAR',
  COMMANDER = 'COMMANDER',
  SAGE = 'SAGE',
  VISIONARY = 'VISIONARY',
}
