// ── Learning system types ─────────────────────────────────────────────

export type LearningBranch = 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION';

export type LevelName = 'SLEEPING' | 'AWAKENED' | 'OBSERVER' | 'WARRIOR' | 'STRATEGIST' | 'MASTER';

export type DeliveryStyle = 'analytical' | 'practical' | 'philosophical';

export type DifficultyTier = 'BRONZE' | 'SILVER' | 'GOLD';

// ── Determination ─────────────────────────────────────────────────────

export interface DeterminationAnswer {
  /** Situation index 1-5 (maps to branches in order) */
  situationIndex: number;
  /** Chosen option 0-3 (0 = most aligned with branch, 3 = least) */
  chosenOption: number;
}

export interface DeterminationResult {
  /** Strongest branch — starting zone */
  startZone: LearningBranch;
  /** Weakest branch — pain point to develop */
  painPoint: LearningBranch;
  /** Preferred delivery style */
  deliveryStyle: DeliveryStyle;
  /** Normalized scores per branch (0-1) */
  branchScores: Record<LearningBranch, number>;
}

// ── Concept for path building ─────────────────────────────────────────

export interface ConceptNode {
  id: string;
  slug: string;
  nameRu: string;
  branch: LearningBranch;
  difficulty: DifficultyTier;
  bloomLevel: number;
  /** IDs of concepts that must be learned before this one */
  prerequisiteIds: string[];
}

// ── Interaction metrics ──────────────────────────────────────────────

export type InteractionType = 'VIEW' | 'ANSWER' | 'DEEPER' | 'COMPLETE';

export interface CardInteraction {
  cardIndex: number;
  type: InteractionType;
  timeSpentMs: number;
  answer: string | null;
  timestamp: string;
}

export interface DayMetrics {
  interactions: CardInteraction[];
}

// ── Engagement signals ───────────────────────────────────────────────

export interface EngagementSignals {
  /** Average time per card in ms */
  avgTimePerCard: number;
  /** Did user click "deeper" on any card */
  usedDepth: boolean;
  /** Number of depth clicks */
  depthClicks: number;
  /** Quiz answer correctness (0-1) */
  quizAccuracy: number;
  /** Explain grade: 'understood' | 'partial' | 'missed' | null */
  explainGrade: string | null;
  /** Total time spent on the day in ms */
  totalTimeMs: number;
  /** Number of cards viewed */
  cardsViewed: number;
  /** Total cards in day */
  totalCards: number;
}

export interface ConceptConfidence {
  conceptId: string;
  /** Overall confidence 0-1 based on quiz + explain + time */
  confidence: number;
  /** Engagement level: 'high' | 'medium' | 'low' */
  engagement: 'high' | 'medium' | 'low';
  /** Was the "deeper" button used */
  wentDeeper: boolean;
}

// ── Adaptation rules ─────────────────────────────────────────────────

export type AdaptationAction =
  | { type: 'REORDER'; conceptId: string; moveTo: 'earlier' | 'later' }
  | { type: 'ADD_DEPTH'; conceptId: string; reason: string }
  | { type: 'SKIP'; conceptId: string; reason: string }
  | { type: 'REPEAT'; conceptId: string; dayNumber: number }
  | { type: 'CHANGE_STYLE'; newStyle: DeliveryStyle };
