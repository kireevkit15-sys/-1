export enum BattlePhase {
  WAITING = 'WAITING',
  MATCHED = 'MATCHED',
  CATEGORY_SELECT = 'CATEGORY_SELECT',
  ROUND_ATTACK = 'ROUND_ATTACK',
  ROUND_DEFENSE = 'ROUND_DEFENSE',
  ROUND_RESULT = 'ROUND_RESULT',
  SWAP_ROLES = 'SWAP_ROLES',
  FINAL_RESULT = 'FINAL_RESULT',
}

export enum Difficulty {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export enum DefenseType {
  ACCEPT = 'ACCEPT',
  DISPUTE = 'DISPUTE',
  COUNTER = 'COUNTER',
}

export enum BattleMode {
  SIEGE = 'SIEGE',
  SPARRING = 'SPARRING',
}

export enum PlayerRole {
  ATTACKER = 'ATTACKER',
  DEFENDER = 'DEFENDER',
}

export interface BattlePlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  score: number;
  hp: number;
}

export interface BattleRound {
  roundNumber: number;
  attackerId: string;
  defenderId: string;
  questionId?: string;
  difficulty?: Difficulty;
  attackerAnswer?: number;
  attackerCorrect?: boolean;
  defenseType?: DefenseType;
  defenseSuccess?: boolean;
  damageDealt: number;
  pointsAwarded: number;
}

export interface BattleState {
  id: string;
  phase: BattlePhase;
  mode: BattleMode;
  player1: BattlePlayer;
  player2: BattlePlayer;
  currentRound: number;
  totalRounds: number;
  rounds: BattleRound[];
  categories: string[];
  selectedCategory?: string;
  currentAttackerId?: string;
  currentDefenderId?: string;
  timeLimit: number;
  startedAt?: number;
  endedAt?: number;
  abandonedBy?: string;
  timedOutRound?: number;
}

export interface BattleConfig {
  idGenerator?: () => string;
  damageRng?: (min: number, max: number) => number;
}

export interface BattleResult {
  winnerId: string | null;
  player1Score: number;
  player2Score: number;
  xpGained: Record<string, number>;
  ratingChange: number;
}
