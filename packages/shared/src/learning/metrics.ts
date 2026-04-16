/**
 * L22.4 — Learning metrics calculator
 *
 * Analyzes raw interaction data from a learning day to produce
 * engagement signals and concept confidence scores.
 */

import type { CardInteraction, EngagementSignals, ConceptConfidence } from './types';

// ── Thresholds ───────────────────────────────────────────────────────

/** Minimum meaningful time on a card (ms). Below this = skipped. */
const MIN_CARD_TIME_MS = 2_000;

/** Ideal time range per card (ms). */
const IDEAL_TIME_MIN_MS = 8_000;
const IDEAL_TIME_MAX_MS = 60_000;

/** Long dwell = high engagement (ms). */
const LONG_DWELL_MS = 45_000;

// ── Engagement signals ───────────────────────────────────────────────

export function computeEngagement(
  interactions: CardInteraction[],
  totalCards: number,
): EngagementSignals {
  if (interactions.length === 0) {
    return {
      avgTimePerCard: 0,
      usedDepth: false,
      depthClicks: 0,
      quizAccuracy: 0,
      explainGrade: null,
      totalTimeMs: 0,
      cardsViewed: 0,
      totalCards,
    };
  }

  // Cards viewed (unique card indices with VIEW or COMPLETE)
  const viewedIndices = new Set<number>();
  let totalTimeMs = 0;
  let depthClicks = 0;
  let quizCorrect = 0;
  let quizTotal = 0;
  let explainGrade: string | null = null;

  for (const interaction of interactions) {
    if (interaction.type === 'VIEW' || interaction.type === 'COMPLETE') {
      viewedIndices.add(interaction.cardIndex);
    }

    totalTimeMs += interaction.timeSpentMs;

    if (interaction.type === 'DEEPER') {
      depthClicks++;
    }

    if (interaction.type === 'ANSWER' && interaction.answer != null) {
      quizTotal++;
      // Answer format: "correct" or "wrong" (set by frontend)
      if (interaction.answer === 'correct') {
        quizCorrect++;
      }
    }
  }

  // Find explain interactions (cardIndex for explain card is typically 5)
  const explainInteraction = interactions.find(
    (i) => i.type === 'ANSWER' && i.answer != null &&
    ['understood', 'partial', 'missed'].includes(i.answer),
  );
  if (explainInteraction) {
    explainGrade = explainInteraction.answer;
  }

  const cardsViewed = viewedIndices.size;
  const avgTimePerCard = cardsViewed > 0 ? totalTimeMs / cardsViewed : 0;
  const quizAccuracy = quizTotal > 0 ? quizCorrect / quizTotal : 0;

  return {
    avgTimePerCard,
    usedDepth: depthClicks > 0,
    depthClicks,
    quizAccuracy,
    explainGrade,
    totalTimeMs,
    cardsViewed,
    totalCards,
  };
}

// ── Concept confidence ───────────────────────────────────────────────

/**
 * Calculates a concept confidence score (0-1) from engagement signals.
 *
 * Factors:
 * - Quiz accuracy (40% weight)
 * - Explain grade (30% weight)
 * - Time engagement (20% weight)
 * - Completion (10% weight)
 */
export function computeConceptConfidence(
  conceptId: string,
  engagement: EngagementSignals,
): ConceptConfidence {
  // Quiz factor (0-1)
  const quizFactor = engagement.quizAccuracy;

  // Explain factor (0-1)
  let explainFactor = 0.5; // default when no explain
  if (engagement.explainGrade === 'understood') explainFactor = 1.0;
  else if (engagement.explainGrade === 'partial') explainFactor = 0.5;
  else if (engagement.explainGrade === 'missed') explainFactor = 0.1;

  // Time factor (0-1): reward ideal time range
  let timeFactor = 0.5;
  if (engagement.avgTimePerCard >= IDEAL_TIME_MIN_MS && engagement.avgTimePerCard <= IDEAL_TIME_MAX_MS) {
    timeFactor = 1.0;
  } else if (engagement.avgTimePerCard < MIN_CARD_TIME_MS) {
    timeFactor = 0.1; // rushed through
  } else if (engagement.avgTimePerCard > LONG_DWELL_MS) {
    timeFactor = 0.7; // spent long time = possibly struggling
  }

  // Completion factor
  const completionFactor = engagement.totalCards > 0
    ? Math.min(1, engagement.cardsViewed / engagement.totalCards)
    : 0;

  // Weighted confidence
  const confidence = Math.min(1, Math.max(0,
    quizFactor * 0.4 +
    explainFactor * 0.3 +
    timeFactor * 0.2 +
    completionFactor * 0.1,
  ));

  // Engagement level
  let engagementLevel: 'high' | 'medium' | 'low';
  if (engagement.usedDepth && engagement.avgTimePerCard >= IDEAL_TIME_MIN_MS) {
    engagementLevel = 'high';
  } else if (engagement.avgTimePerCard >= MIN_CARD_TIME_MS && completionFactor >= 0.7) {
    engagementLevel = 'medium';
  } else {
    engagementLevel = 'low';
  }

  return {
    conceptId,
    confidence,
    engagement: engagementLevel,
    wentDeeper: engagement.usedDepth,
  };
}
