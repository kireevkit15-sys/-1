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
  xpToNextLevel,
  getBranchLevels,
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

// Feed
export {
  FeedCardType,
  WarriorRank,
  FeedInteractionType,
} from './feed/types';
export type {
  InsightContent,
  ChallengeContent,
  CaseContent,
  SparringContent,
  ForgeContent,
  WisdomContent,
  ArenaContent,
  FeedCardContent,
  CampaignDay,
  CampaignDayCard,
  CampaignData,
  FeedCard,
  DailyFeedData,
  FeedInteraction,
} from './feed/types';

export {
  MAX_ACTIVE_CAMPAIGNS,
  DAILY_CARDS_TARGET,
  DAILY_CARDS_MIN,
  CARD_RATIO,
  FEED_XP,
  SRS_INTERVALS,
  ADAPTIVE,
  ARENA_INTERVAL,
  WISDOM_INTERVAL,
  RANK_THRESHOLDS,
  FIRE_STREAK_THRESHOLD,
  MAX_DAILY_FORGE_CARDS,
  FEED_CACHE_TTL,
} from './feed/constants';

// Cards (card battle system)
export {
  CardRarity,
  CardType,
  CardEffectTrigger,
  CardEffectType,
  CardBattlePhase,
  BotPersonality,
} from './cards/types';
export type {
  CardDefinition,
  PlayerCard,
  HandCard,
  CardBattlePlayer,
  ActiveBuff,
  CardBattleTurn,
  CardBattleState,
  BotConfig,
  CardBattleResult,
} from './cards/types';

export {
  CARD_BATTLE,
  LEVEL_SCALE,
  SPEED_BONUS,
  CARD_LEVEL_XP,
  CARD_REWARD_CHANCE,
  BOT_CONFIGS,
  CRAFT_RECIPES,
} from './cards/constants';

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
