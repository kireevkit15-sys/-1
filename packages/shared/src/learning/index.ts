// Types
export type {
  LearningBranch,
  LevelName,
  DeliveryStyle,
  DifficultyTier,
  DeterminationAnswer,
  DeterminationResult,
  ConceptNode,
  InteractionType,
  CardInteraction,
  DayMetrics,
  EngagementSignals,
  ConceptConfidence,
  AdaptationAction,
} from './types';

// Determination (L22.1)
export { analyzeDetermination } from './determination';

// Path builder (L22.2)
export { buildLearningPath, MAX_PATH_DAYS } from './path-builder';
export type { BuildPathOptions } from './path-builder';

// Adaptation (L22.3)
export { computeAdaptations, computeMasteryDelta } from './adaptation';
export type { AdaptationContext } from './adaptation';

// Metrics (L22.4)
export { computeEngagement, computeConceptConfidence } from './metrics';

// Constants
export {
  LEVEL_ORDER,
  LEVEL_DISPLAY_NAMES,
  BARRIER_PASS_THRESHOLD,
  BARRIER_WEIGHTS,
  DAYS_PER_LEVEL,
  MASTERY_DELTAS,
  SRS_INTERVALS as LEARNING_SRS_INTERVALS,
  BRANCH_NAMES,
} from './constants';

// Topological sort
export { topologicalSort } from './topological-sort';
export type { SortableConcept, ConceptRelation, LearningPathEntry } from './topological-sort';
