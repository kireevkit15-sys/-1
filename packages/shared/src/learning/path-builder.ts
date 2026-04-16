/**
 * L22.2 — Intelligent path builder
 *
 * Builds a personalized 30-concept learning sequence using:
 * 1. Topological sort respecting prerequisites
 * 2. Branch-aware ordering (start zone first, pain point woven in gradually)
 * 3. Difficulty progression (BRONZE → SILVER → GOLD)
 * 4. Bloom level progression within difficulty tiers
 * 5. Interleaving branches for variety (not 10 STRATEGY in a row)
 */

import type { ConceptNode, LearningBranch, DeterminationResult, DifficultyTier } from './types';

// ── Configuration ────────────────────────────────────────────────────

/** Max days in a learning path */
export const MAX_PATH_DAYS = 30;

/** How many concepts from startZone in the first 5 days */
const START_ZONE_FRONT_LOAD = 3;

/** After day N, start introducing pain point branch */
const PAIN_POINT_INTRO_DAY = 4;

/** Max consecutive concepts from same branch */
const MAX_CONSECUTIVE_SAME_BRANCH = 3;

const DIFFICULTY_ORDER: Record<DifficultyTier, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
};

// ── Topological sort ─────────────────────────────────────────────────

/**
 * Kahn's algorithm for topological sort.
 * Returns concepts in prerequisite-respecting order.
 * Cycles are broken by removing back-edges (shouldn't happen in clean data).
 */
function topologicalSort(concepts: ConceptNode[]): ConceptNode[] {
  const idSet = new Set(concepts.map((c) => c.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeMap = new Map<string, ConceptNode>();

  for (const c of concepts) {
    nodeMap.set(c.id, c);
    inDegree.set(c.id, 0);
    adjacency.set(c.id, []);
  }

  // Build graph (only edges within our concept set)
  for (const c of concepts) {
    for (const prereqId of c.prerequisiteIds) {
      if (idSet.has(prereqId)) {
        adjacency.get(prereqId)!.push(c.id);
        inDegree.set(c.id, (inDegree.get(c.id) ?? 0) + 1);
      }
    }
  }

  // Kahn's: start from nodes with 0 in-degree
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: ConceptNode[] = [];
  while (queue.length > 0) {
    // Sort queue for deterministic ordering: by difficulty, then bloom
    queue.sort((a, b) => {
      const ca = nodeMap.get(a)!;
      const cb = nodeMap.get(b)!;
      const dA = DIFFICULTY_ORDER[ca.difficulty];
      const dB = DIFFICULTY_ORDER[cb.difficulty];
      if (dA !== dB) return dA - dB;
      return ca.bloomLevel - cb.bloomLevel;
    });

    const id = queue.shift()!;
    const node = nodeMap.get(id)!;
    result.push(node);

    for (const neighborId of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(neighborId) ?? 1) - 1;
      inDegree.set(neighborId, newDeg);
      if (newDeg === 0) queue.push(neighborId);
    }
  }

  // Handle remaining nodes (cycles) — add them sorted by difficulty
  if (result.length < concepts.length) {
    const added = new Set(result.map((c) => c.id));
    const remaining = concepts
      .filter((c) => !added.has(c.id))
      .sort((a, b) => {
        const dA = DIFFICULTY_ORDER[a.difficulty];
        const dB = DIFFICULTY_ORDER[b.difficulty];
        if (dA !== dB) return dA - dB;
        return a.bloomLevel - b.bloomLevel;
      });
    result.push(...remaining);
  }

  return result;
}

// ── Branch-aware interleaving ────────────────────────────────────────

/**
 * Reorders concepts to:
 * 1. Front-load startZone in early days
 * 2. Introduce painPoint after day PAIN_POINT_INTRO_DAY
 * 3. Prevent more than MAX_CONSECUTIVE_SAME_BRANCH in a row
 * 4. Keep prerequisite order intact
 */
function interleaveBranches(
  sorted: ConceptNode[],
  determination: DeterminationResult,
): ConceptNode[] {
  const { startZone, painPoint, branchScores } = determination;

  // Partition into buckets by branch
  const buckets = new Map<LearningBranch, ConceptNode[]>();
  for (const c of sorted) {
    const list = buckets.get(c.branch) ?? [];
    list.push(c);
    buckets.set(c.branch, list);
  }

  // Build order based on branch priority per phase
  const result: ConceptNode[] = [];
  const used = new Set<string>();

  // Phase 1: First START_ZONE_FRONT_LOAD concepts from startZone
  const startBucket = buckets.get(startZone) ?? [];
  for (let i = 0; i < START_ZONE_FRONT_LOAD && i < startBucket.length; i++) {
    const c = startBucket[i]!;
    result.push(c);
    used.add(c.id);
  }

  // Phase 2: Interleave remaining concepts
  // Sort branches by score (descending) for priority, but put painPoint last early on
  const branchOrder = (Object.keys(branchScores) as LearningBranch[]).sort((a, b) => {
    // painPoint gets pushed later
    if (a === painPoint) return 1;
    if (b === painPoint) return -1;
    return branchScores[b] - branchScores[a];
  });

  let consecutiveBranch: LearningBranch | null = null;
  let consecutiveCount = 0;

  // Round-robin through branches, picking next available from each
  const branchPointers = new Map<LearningBranch, number>();
  for (const branch of branchOrder) {
    branchPointers.set(branch, 0);
  }

  const maxConcepts = Math.min(MAX_PATH_DAYS, sorted.length);

  while (result.length < maxConcepts) {
    let added = false;

    for (const branch of branchOrder) {
      if (result.length >= maxConcepts) break;

      // Skip pain point until we're past intro day
      if (branch === painPoint && result.length < PAIN_POINT_INTRO_DAY) continue;

      // Find next unused concept from this branch
      const bucket = buckets.get(branch) ?? [];
      let ptr = branchPointers.get(branch) ?? 0;

      while (ptr < bucket.length && used.has(bucket[ptr]!.id)) {
        ptr++;
      }

      if (ptr >= bucket.length) {
        branchPointers.set(branch, ptr);
        continue;
      }

      const concept = bucket[ptr]!;

      // Check prerequisites are satisfied
      const prereqsMet = concept.prerequisiteIds.every((pid) => used.has(pid) || !sorted.some((c) => c.id === pid));
      if (!prereqsMet) {
        branchPointers.set(branch, ptr + 1);
        continue;
      }

      // Check consecutive branch limit
      if (branch === consecutiveBranch && consecutiveCount >= MAX_CONSECUTIVE_SAME_BRANCH) {
        continue;
      }

      result.push(concept);
      used.add(concept.id);
      branchPointers.set(branch, ptr + 1);
      added = true;

      if (branch === consecutiveBranch) {
        consecutiveCount++;
      } else {
        consecutiveBranch = branch;
        consecutiveCount = 1;
      }
    }

    // Safety: if no branch could add anything, pick any remaining
    if (!added) {
      const remaining = sorted.find((c) => !used.has(c.id));
      if (!remaining) break;
      result.push(remaining);
      used.add(remaining.id);
    }
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────

export interface BuildPathOptions {
  /** All available concepts in the knowledge graph */
  concepts: ConceptNode[];
  /** Result of initial determination */
  determination: DeterminationResult;
  /** Max concepts in path (default: MAX_PATH_DAYS) */
  maxDays?: number;
}

/**
 * Builds a personalized learning path.
 * Returns ordered list of concept IDs for each day.
 */
export function buildLearningPath(options: BuildPathOptions): ConceptNode[] {
  const { concepts, determination, maxDays = MAX_PATH_DAYS } = options;

  if (concepts.length === 0) return [];

  // Step 1: Topological sort respecting prerequisites
  const topoSorted = topologicalSort(concepts);

  // Step 2: Interleave branches for variety
  const interleaved = interleaveBranches(topoSorted, determination);

  // Step 3: Trim to max days
  return interleaved.slice(0, maxDays);
}
