/**
 * Topological sort and learning path builder for the RAZUM knowledge graph.
 *
 * Uses Kahn's algorithm (BFS) to order concepts so that every PREREQUISITE
 * is visited before the concepts that depend on it.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SortableConcept {
  id: string;
  branch: string;
  difficulty: string; // 'BRONZE' | 'SILVER' | 'GOLD'
  bloomLevel: number;
}

export interface ConceptRelation {
  sourceId: string;
  targetId: string;
  relationType: string; // 'PREREQUISITE' | 'RELATED' | …
}

export interface LearningPathEntry {
  dayNumber: number;
  conceptId: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_ORDER: Record<string, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
};

/** How many concepts form one "level" inside a learning path. */
const DAYS_PER_LEVEL = 5;

/** Default cap for total days in a learning path. */
const DEFAULT_MAX_DAYS = 30;

// ---------------------------------------------------------------------------
// topologicalSort
// ---------------------------------------------------------------------------

/**
 * Topological sort of concepts respecting PREREQUISITE edges.
 *
 * Within each BFS layer (nodes whose in-degree is 0 at the same step)
 * the order is:
 *   1. Concepts from `startZone` branch come first.
 *   2. Then by difficulty ASC (BRONZE < SILVER < GOLD).
 *   3. Then by bloomLevel ASC.
 *
 * If a cycle is detected the remaining nodes are appended at the end,
 * sorted by difficulty then bloomLevel, and a warning is logged.
 *
 * @returns Ordered array of concept IDs.
 */
export function topologicalSort(
  concepts: readonly SortableConcept[],
  relations: readonly ConceptRelation[],
  startZone?: string | null,
): string[] {
  // Fast-path: nothing to sort
  if (concepts.length === 0) return [];

  // Build a set of valid concept IDs for filtering stale edges
  const conceptIds = new Set(concepts.map((c) => c.id));

  // Filter to PREREQUISITE edges whose both ends exist in the input set.
  // Edge direction: sourceId --PREREQUISITE--> targetId
  //   meaning sourceId must be learned BEFORE targetId.
  const prerequisiteEdges = relations.filter(
    (r) =>
      r.relationType === 'PREREQUISITE' &&
      conceptIds.has(r.sourceId) &&
      conceptIds.has(r.targetId),
  );

  // Adjacency list:  source  -> Set<target>
  const adjacency = new Map<string, Set<string>>();
  // In-degree per concept
  const inDegree = new Map<string, number>();

  // Initialise every concept
  for (const c of concepts) {
    adjacency.set(c.id, new Set());
    inDegree.set(c.id, 0);
  }

  // Populate from edges
  for (const edge of prerequisiteEdges) {
    const neighbours = adjacency.get(edge.sourceId);
    if (neighbours && !neighbours.has(edge.targetId)) {
      neighbours.add(edge.targetId);
      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
    }
  }

  // Lookup map: id -> concept (for tie-breaking inside layers)
  const conceptMap = new Map<string, SortableConcept>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  // Comparator used inside each layer
  const layerCompare = (aId: string, bId: string): number => {
    const a = conceptMap.get(aId)!;
    const b = conceptMap.get(bId)!;

    // 1. Preferred branch first
    if (startZone) {
      if (a.branch === startZone && b.branch !== startZone) return -1;
      if (b.branch === startZone && a.branch !== startZone) return 1;
    }

    // 2. Difficulty ASC
    const diffA = DIFFICULTY_ORDER[a.difficulty] ?? 0;
    const diffB = DIFFICULTY_ORDER[b.difficulty] ?? 0;
    if (diffA !== diffB) return diffA - diffB;

    // 3. Bloom level ASC
    return a.bloomLevel - b.bloomLevel;
  };

  // ── Kahn's algorithm ───────────────────────────────────────────────
  const result: string[] = [];

  // Seed the queue with all 0 in-degree nodes
  let queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  queue.sort(layerCompare);

  while (queue.length > 0) {
    // Process the entire current layer
    const nextQueue: string[] = [];

    for (const id of queue) {
      result.push(id);

      const neighbours = adjacency.get(id);
      if (neighbours) {
        for (const neighbour of neighbours) {
          const newDeg = (inDegree.get(neighbour) ?? 1) - 1;
          inDegree.set(neighbour, newDeg);
          if (newDeg === 0) {
            nextQueue.push(neighbour);
          }
        }
      }
    }

    nextQueue.sort(layerCompare);
    queue = nextQueue;
  }

  // ── Cycle handling ─────────────────────────────────────────────────
  if (result.length < concepts.length) {
    const visited = new Set(result);
    const remaining = concepts
      .filter((c) => !visited.has(c.id))
      .map((c) => c.id);

    remaining.sort(layerCompare);

    // eslint-disable-next-line no-console
    console.warn(
      `[topologicalSort] Cycle detected: ${remaining.length} concept(s) could not be ordered by prerequisites. Appending by difficulty.`,
    );

    result.push(...remaining);
  }

  return result;
}

// ---------------------------------------------------------------------------
// buildLearningPath
// ---------------------------------------------------------------------------

/**
 * Build a day-by-day learning path from the knowledge graph.
 *
 * 1. Runs `topologicalSort` to get prerequisite-respecting order.
 * 2. Assigns each concept to a day (1-based).
 * 3. Groups days into levels (every `DAYS_PER_LEVEL` days = 1 level).
 * 4. Caps at `maxDays`.
 *
 * @returns Array of `{ dayNumber, conceptId, level }`.
 */
export function buildLearningPath(
  concepts: readonly SortableConcept[],
  relations: readonly ConceptRelation[],
  startZone?: string | null,
  maxDays: number = DEFAULT_MAX_DAYS,
): LearningPathEntry[] {
  const ordered = topologicalSort(concepts, relations, startZone);

  const capped = ordered.slice(0, maxDays);

  return capped.map((conceptId, idx) => ({
    dayNumber: idx + 1,
    conceptId,
    level: Math.floor(idx / DAYS_PER_LEVEL) + 1,
  }));
}
