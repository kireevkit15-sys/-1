import { Branch, Difficulty } from '../battle/types';

// ── Card Types ─────────────────────────────────
export enum FeedCardType {
  /** Концепт + пример из реальности — дать новое знание */
  INSIGHT = 'INSIGHT',
  /** Вопрос на только что изученный концепт — закрепить */
  CHALLENGE = 'CHALLENGE',
  /** Реальная ситуация + "Что бы ты сделал?" + разбор — применить */
  CASE = 'CASE',
  /** Мини-бой: 1 вопрос против призрака прошлого противника */
  SPARRING = 'SPARRING',
  /** Повтор карточки, которую провалил ранее (spaced repetition) */
  FORGE = 'FORGE',
  /** Цитата великого мыслителя + контекст + связь с веткой */
  WISDOM = 'WISDOM',
  /** Приглашение в бой на тему, которую только что изучил */
  ARENA = 'ARENA',
}

// ── Campaign Difficulty / Warrior Rank ──────────
export enum WarriorRank {
  NOVICE = 'NOVICE',         // 0-500 XP
  WARRIOR = 'WARRIOR',       // 500-2000 XP
  GLADIATOR = 'GLADIATOR',   // 2000-5000 XP
  STRATEGIST = 'STRATEGIST', // 5000-15000 XP
  SPARTAN = 'SPARTAN',       // 15000+ XP
}

// ── Insight Card Content ────────────────────────
export interface InsightContent {
  title: string;
  body: string;          // Main concept explanation (markdown)
  example: string;       // Real-world example
  source?: string;       // Academic source reference
  imageUrl?: string;     // Optional illustration
}

// ── Challenge Card Content ──────────────────────
export interface ChallengeContent {
  questionId: string;    // Reference to Question model
  // Inlined for offline / fast rendering:
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

// ── Case Card Content ───────────────────────────
export interface CaseContent {
  scenario: string;      // Real situation description
  question: string;      // "What would you do?"
  options: string[];     // 3-4 choices
  bestOptionIndex: number;
  analysis: string;      // Detailed breakdown (markdown)
  realExample?: string;  // "Steve Jobs did X..."
}

// ── Sparring Card Content ───────────────────────
export interface SparringContent {
  questionId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  opponentName: string;       // Ghost opponent name
  opponentTimeMs: number;     // Their answer time
  opponentCorrect: boolean;   // Did they get it right?
}

// ── Forge Card Content (Spaced Repetition) ──────
export interface ForgeContent {
  originalCardId: string;     // Card where user failed
  questionId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  failedAt: string;           // ISO date when user failed
  attempt: number;            // 1, 2, 3... (SRS attempt number)
}

// ── Wisdom Card Content ─────────────────────────
export interface WisdomContent {
  quote: string;
  author: string;
  authorTitle?: string;       // "Древнекитайский стратег"
  context: string;            // Why this matters, connection to branch
}

// ── Arena Card Content ──────────────────────────
export interface ArenaContent {
  message: string;            // "Ты изучил 3 концепта по Стратегии"
  branch: Branch;
  conceptsLearned: number;
  suggestedDifficulty: Difficulty;
}

// ── Union type for card content ─────────────────
export type FeedCardContent =
  | { type: FeedCardType.INSIGHT; data: InsightContent }
  | { type: FeedCardType.CHALLENGE; data: ChallengeContent }
  | { type: FeedCardType.CASE; data: CaseContent }
  | { type: FeedCardType.SPARRING; data: SparringContent }
  | { type: FeedCardType.FORGE; data: ForgeContent }
  | { type: FeedCardType.WISDOM; data: WisdomContent }
  | { type: FeedCardType.ARENA; data: ArenaContent };

// ── Campaign Structure ──────────────────────────
export interface CampaignDay {
  dayNumber: number;
  cards: CampaignDayCard[];
}

export interface CampaignDayCard {
  orderInDay: number;
  type: FeedCardType;
  content: FeedCardContent;
  branch: Branch;
  statPrimary?: string;
}

export interface CampaignData {
  id: string;
  title: string;
  description: string;
  branch: Branch;
  rank: WarriorRank;
  durationDays: number;
  totalCards: number;
  prerequisiteCampaignIds: string[];
  days: CampaignDay[];
}

// ── User Feed State ─────────────────────────────
export interface FeedCard {
  id: string;
  type: FeedCardType;
  content: FeedCardContent;
  branch: Branch;
  campaignId?: string;
  dayNumber?: number;
  orderInDay?: number;
}

export interface DailyFeedData {
  date: string;              // YYYY-MM-DD
  cards: FeedCard[];
  totalCards: number;
  viewedCards: number;
  campaignProgress: {
    campaignId: string;
    campaignTitle: string;
    currentDay: number;
    totalDays: number;
    branch: Branch;
  }[];
  streak: {
    current: number;
    feedStreak: number;       // Days with 10+ cards viewed
    isOnFire: boolean;        // streak > 7
  };
}

// ── Interaction ─────────────────────────────────
export enum FeedInteractionType {
  VIEWED = 'VIEWED',
  ANSWERED_CORRECT = 'ANSWERED_CORRECT',
  ANSWERED_WRONG = 'ANSWERED_WRONG',
  SKIPPED = 'SKIPPED',
  ARENA_CLICKED = 'ARENA_CLICKED',
}

export interface FeedInteraction {
  cardId: string;
  type: FeedInteractionType;
  answerIndex?: number;
  timeTakenMs?: number;
}
