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
