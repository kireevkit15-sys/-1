/**
 * L22.3 — Live adaptation engine
 *
 * 4 rules that shape the learning path based on behavior:
 * 1. Interesting → more: if engagement is high, add related concepts
 * 2. Mastered → faster: if confidence is high, skip or compress
 * 3. Boring → minimum: if engagement is low, switch approach
 * 4. Weak → differently: if confidence is low, repeat with different angle
 */

import type {
  ConceptConfidence,
  EngagementSignals,
  AdaptationAction,
  LearningBranch,
  DeliveryStyle,
} from './types';

// ── Thresholds ───────────────────────────────────────────────────────

/** Confidence above this → concept is mastered, can accelerate */
const MASTERED_THRESHOLD = 0.85;

/** Confidence below this → concept is weak, needs repetition */
const WEAK_THRESHOLD = 0.35;

/** Engagement high if avg time > this AND depth used */
const HIGH_ENGAGEMENT_TIME_MS = 15_000;

/** Engagement low if avg time < this */
const LOW_ENGAGEMENT_TIME_MS = 4_000;

/** After this many low-engagement days in a row, suggest style change */
const STYLE_CHANGE_THRESHOLD = 3;

// ── Rule engine ──────────────────────────────────────────────────────

export interface AdaptationContext {
  /** Current day's concept confidence */
  currentConfidence: ConceptConfidence;
  /** Current day's engagement */
  currentEngagement: EngagementSignals;
  /** History of recent confidences (last 5 days) */
  recentConfidences: ConceptConfidence[];
  /** History of recent engagements (last 5 days) */
  recentEngagements: EngagementSignals[];
  /** Upcoming concept IDs still in the path */
  upcomingConceptIds: string[];
  /** Branch of current concept */
  currentBranch: LearningBranch;
  /** Current delivery style */
  currentStyle: DeliveryStyle;
  /** Current day number */
  dayNumber: number;
}

/**
 * Analyze a completed day and return adaptation actions.
 * May return 0 or more actions — the caller decides which to apply.
 */
export function computeAdaptations(ctx: AdaptationContext): AdaptationAction[] {
  const actions: AdaptationAction[] = [];

  // ── Rule 1: Interesting → more ──────────────────────────────────
  if (
    ctx.currentConfidence.engagement === 'high' &&
    ctx.currentConfidence.wentDeeper &&
    ctx.currentEngagement.avgTimePerCard >= HIGH_ENGAGEMENT_TIME_MS
  ) {
    // User is highly engaged with this branch — bring related concepts earlier
    const relatedUpcoming = ctx.upcomingConceptIds.filter((id) => id !== ctx.currentConfidence.conceptId);
    if (relatedUpcoming.length > 0) {
      actions.push({
        type: 'ADD_DEPTH',
        conceptId: ctx.currentConfidence.conceptId,
        reason: 'high_engagement',
      });
    }
  }

  // ── Rule 2: Mastered → faster ───────────────────────────────────
  if (ctx.currentConfidence.confidence >= MASTERED_THRESHOLD) {
    // User nailed this concept — check if next concepts in same branch can be skipped
    const recentMastered = ctx.recentConfidences.filter(
      (c) => c.confidence >= MASTERED_THRESHOLD,
    );

    // If 3+ consecutive masteries, allow skipping next easy concept
    if (recentMastered.length >= 2) {
      // Find a BRONZE concept in upcoming that could be skipped
      // (Caller needs to check difficulty — we just signal the intent)
      actions.push({
        type: 'SKIP',
        conceptId: ctx.currentConfidence.conceptId,
        reason: 'consecutive_mastery',
      });
    }
  }

  // ── Rule 3: Boring → minimum ────────────────────────────────────
  if (
    ctx.currentConfidence.engagement === 'low' &&
    ctx.currentEngagement.avgTimePerCard < LOW_ENGAGEMENT_TIME_MS
  ) {
    // Count recent low engagements
    const recentLow = ctx.recentEngagements.filter(
      (e) => e.avgTimePerCard < LOW_ENGAGEMENT_TIME_MS,
    );

    if (recentLow.length >= STYLE_CHANGE_THRESHOLD) {
      // Suggest delivery style change
      const newStyle = suggestNewStyle(ctx.currentStyle);
      actions.push({ type: 'CHANGE_STYLE', newStyle });
    }
  }

  // ── Rule 4: Weak → differently ──────────────────────────────────
  if (ctx.currentConfidence.confidence <= WEAK_THRESHOLD) {
    // Schedule repeat of this concept 2 days later
    actions.push({
      type: 'REPEAT',
      conceptId: ctx.currentConfidence.conceptId,
      dayNumber: ctx.dayNumber + 2,
    });
  }

  return actions;
}

// ── Mastery delta calculation ─────────────────────────────────────────

/**
 * Calculate mastery increment based on concept confidence.
 * Replaces the fixed +0.1 with a dynamic value.
 *
 * - High confidence (0.85+): +0.15 mastery
 * - Medium confidence (0.5-0.85): +0.10 mastery
 * - Low confidence (0.35-0.5): +0.05 mastery
 * - Very low (<0.35): +0.02 mastery (still some credit for attempting)
 */
export function computeMasteryDelta(confidence: number): number {
  if (confidence >= 0.85) return 0.15;
  if (confidence >= 0.5) return 0.10;
  if (confidence >= 0.35) return 0.05;
  return 0.02;
}

// ── Helpers ───────────────────────────────────────────────────────────

function suggestNewStyle(current: DeliveryStyle): DeliveryStyle {
  const rotation: Record<DeliveryStyle, DeliveryStyle> = {
    analytical: 'practical',
    practical: 'philosophical',
    philosophical: 'analytical',
  };
  return rotation[current];
}
