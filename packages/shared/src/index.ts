// Battle
export {
  BattlePhase,
  Difficulty,
  DefenseType,
  BattleMode,
  PlayerRole,
  Branch,
  BotLevel,
} from './battle/types';
export type {
  BattlePlayer,
  BattleRound,
  BattleState,
  BattleResult,
  BattleConfig,
} from './battle/types';

export {
  createBattle,
  selectCategory,
  selectBranch,
  chooseDifficulty,
  submitAnswer,
  submitDefense,
  nextPhase,
  isGameOver,
  getResult,
  handleTimeout,
  handleDisconnect,
} from './battle/state-machine';

export {
  calculateDamage,
  calculateDefenseResult,
  calculateXpGained,
  calculateRatingChange,
} from './battle/scoring';

// Stats
export { StatName, ThinkerClass } from './stats/types';
export type { UserStatsData } from './stats/types';

export {
  xpToLevel,
  determineThinkerClass,
  getStatsRadar,
} from './stats/calculator';

// Questions (Branch is re-exported from battle/types)
export type { QuestionData } from './questions/types';

// Content validation
export type { ValidationResult } from './content/validation';
export {
  validateQuestion,
  validateBatch,
  checkDuplicateSimple,
  checkDifficultyConsistency,
} from './content/validation';

// Constants
export {
  MAX_HP,
  ROUNDS_PER_BATTLE,
  ROUND_TIME_LIMIT,
  SPARRING_ROUNDS,
  DAMAGE,
  XP,
  FREE_DAILY_DIALOGUES,
  FREE_DAILY_BATTLES,
  WARMUP_QUESTIONS,
  STREAK_RESET_HOURS,
  ELO_K_FACTOR,
  ELO_DEFAULT_RATING,
} from './constants';
