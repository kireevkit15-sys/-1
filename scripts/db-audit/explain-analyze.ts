/**
 * BT.20 — Database audit: EXPLAIN ANALYZE all indexes under load, slow query detection
 *
 * Runs EXPLAIN ANALYZE on critical queries, checks index usage,
 * detects missing indexes, and reports slow queries.
 *
 * Usage:
 *   npx ts-node scripts/db-audit/explain-analyze.ts
 *   DATABASE_URL=postgres://... npx ts-node scripts/db-audit/explain-analyze.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Types ───────────────────────────────────────────────────────

interface ExplainRow {
  'QUERY PLAN': string;
}

interface QueryAudit {
  name: string;
  description: string;
  sql: string;
  params?: unknown[];
}

interface AuditResult {
  name: string;
  plan: string[];
  executionTimeMs: number;
  usesIndex: boolean;
  usesSeqScan: boolean;
  indexNames: string[];
  warnings: string[];
}

// ── Thresholds ──────────────────────────────────────────��───────

const SLOW_QUERY_THRESHOLD_MS = 200;
const SEQ_SCAN_ROW_THRESHOLD = 1000;

// ── Queries to audit ────────────────────────────────────────────

const QUERIES: QueryAudit[] = [
  // ── Question selection (battle-critical) ───────���────────────
  {
    name: 'getRandomForBattle — 4-col composite',
    description: 'Random questions filtered by branch+difficulty+category+isActive',
    sql: `SELECT * FROM questions
          WHERE branch = 'LOGIC' AND difficulty = 'BRONZE'
            AND "isActive" = true
          ORDER BY RANDOM() LIMIT 5`,
  },
  {
    name: 'getRandomForBattle — branch only',
    description: 'Random questions filtered by branch+isActive only',
    sql: `SELECT * FROM questions
          WHERE branch = 'STRATEGY' AND "isActive" = true
          ORDER BY RANDOM() LIMIT 5`,
  },
  {
    name: 'questions — GIN tag search',
    description: 'Tag-based question lookup via GIN index',
    sql: `SELECT * FROM questions
          WHERE tags @> ARRAY['test']::text[] AND "isActive" = true
          LIMIT 20`,
  },
  {
    name: 'questions — category filter + pagination',
    description: 'Admin question list with category filter',
    sql: `SELECT * FROM questions
          WHERE category = 'decision-making' AND "isActive" = true
          ORDER BY "createdAt" DESC
          LIMIT 20 OFFSET 0`,
  },

  // ── Leaderboard queries ─────────────────────────────────────
  {
    name: 'leaderboard — rating DESC',
    description: 'Top-20 by rating (uses rating DESC index)',
    sql: `SELECT * FROM user_stats
          ORDER BY rating DESC
          LIMIT 20`,
  },
  {
    name: 'leaderboard — totalXp expression index',
    description: 'Top-20 by total XP (expression index on 5 XP fields)',
    sql: `SELECT us."userId", us.rating,
                 (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") AS total_xp
          FROM user_stats us
          ORDER BY (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") DESC
          LIMIT 20`,
  },
  {
    name: 'leaderboard — streak DESC',
    description: 'Top-20 by streak days',
    sql: `SELECT * FROM user_stats
          ORDER BY "streakDays" DESC
          LIMIT 20`,
  },
  {
    name: 'leaderboard — position count',
    description: 'Count users with higher rating (position calculation)',
    sql: `SELECT COUNT(*) FROM user_stats WHERE rating > 1200`,
  },

  // ── Battle queries ──────────────────────────────────────────
  {
    name: 'battles — player1 + status composite',
    description: 'Find waiting battles for player (matchmaking)',
    sql: `SELECT * FROM battles
          WHERE status = 'WAITING'
          ORDER BY "createdAt" ASC
          LIMIT 10`,
  },
  {
    name: 'battles — winner count',
    description: 'Count wins for a user',
    sql: `SELECT COUNT(*) FROM battles
          WHERE "winnerId" IS NOT NULL AND status = 'COMPLETED'`,
  },
  {
    name: 'battles — history pagination',
    description: 'User battle history with endedAt sorting',
    sql: `SELECT * FROM battles
          WHERE status = 'COMPLETED'
          ORDER BY "endedAt" DESC
          LIMIT 10 OFFSET 0`,
  },
  {
    name: 'battleRounds — by battleId',
    description: 'Fetch all rounds for a battle',
    sql: `SELECT * FROM battle_rounds
          WHERE "battleId" = '00000000-0000-0000-0000-000000000000'`,
  },

  // ── Achievement queries ─────────────────────────────────────
  {
    name: 'achievements — active list',
    description: 'Fetch all active achievements',
    sql: `SELECT * FROM achievements WHERE "isActive" = true`,
  },
  {
    name: 'userAchievements — by userId',
    description: 'Batch user achievement lookup',
    sql: `SELECT * FROM user_achievements
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'`,
  },

  // ── Season queries ──────────────────────────────────────────
  {
    name: 'season — top 10 rating with user join',
    description: 'End-of-season ranking with soft-delete filter',
    sql: `SELECT us."userId", us.rating,
                 (us."logicXp" + us."eruditionXp" + us."strategyXp" + us."rhetoricXp" + us."intuitionXp") AS total_xp
          FROM user_stats us
          JOIN users u ON u.id = us."userId" AND u."deletedAt" IS NULL
          ORDER BY us.rating DESC
          LIMIT 10`,
  },

  // ── AI & analytics ──────────────────────────────────────────
  {
    name: 'aiDialogues — by userId',
    description: 'User dialogue history',
    sql: `SELECT * FROM ai_dialogues
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'
          ORDER BY "createdAt" DESC
          LIMIT 20`,
  },
  {
    name: 'aiTokenUsage — user+date composite',
    description: 'Daily token usage per user',
    sql: `SELECT * FROM ai_token_usage
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'
            AND date = CURRENT_DATE`,
  },
  {
    name: 'analyticsEvents — by type',
    description: 'Event count by type',
    sql: `SELECT COUNT(*) FROM analytics_events WHERE type = 'battle_started'`,
  },

  // ── Warmup & challenges ─────────────────────────────────────
  {
    name: 'warmupResult — user+date unique',
    description: 'Check if user completed warmup today',
    sql: `SELECT * FROM warmup_results
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'
            AND date = CURRENT_DATE`,
  },
  {
    name: 'dailyChallenge — user+date unique',
    description: 'Check daily challenge completion',
    sql: `SELECT * FROM daily_challenges
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'
            AND date = CURRENT_DATE`,
  },

  // ── Knowledge (pgvector) ────────────────────────────────────
  {
    name: 'knowledgeChunks — branch filter',
    description: 'Knowledge chunks by branch',
    sql: `SELECT id, content, source, branch FROM knowledge_chunks
          WHERE branch = 'LOGIC'
          LIMIT 10`,
  },

  // ── Referrals & bans ───────────────────────────────────────
  {
    name: 'referrals — by referrerId',
    description: 'Referrer lookup',
    sql: `SELECT * FROM referrals
          WHERE "referrerId" = '00000000-0000-0000-0000-000000000000'`,
  },
  {
    name: 'userBans — active ban check',
    description: 'Check if user is currently banned',
    sql: `SELECT * FROM user_bans
          WHERE "userId" = '00000000-0000-0000-0000-000000000000'
            AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
          LIMIT 1`,
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function extractExecutionTime(plan: string[]): number {
  for (const line of plan) {
    const match = line.match(/Execution Time:\s*([\d.]+)\s*ms/);
    if (match) return parseFloat(match[1]);
  }
  return -1;
}

function extractIndexNames(plan: string[]): string[] {
  const indexes: string[] = [];
  for (const line of plan) {
    const match = line.match(/Index(?:\s+Only)?\s+(?:Scan|Cond).*?(?:using|on)\s+(\S+)/i);
    if (match && !indexes.includes(match[1])) indexes.push(match[1]);
  }
  return indexes;
}

function hasSeqScan(plan: string[]): boolean {
  return plan.some((l) => /Seq Scan/i.test(l));
}

function hasIndexUsage(plan: string[]): boolean {
  return plan.some((l) => /Index/i.test(l));
}

function getSeqScanRows(plan: string[]): number {
  for (const line of plan) {
    const match = line.match(/Seq Scan.*?rows=(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

// ── Main ��───────────────────────────────────────────────────────

async function runAudit(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  РАЗУМ — Database Index Audit (EXPLAIN ANALYZE)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: AuditResult[] = [];

  for (const query of QUERIES) {
    try {
      const rows = await prisma.$queryRawUnsafe<ExplainRow[]>(
        `EXPLAIN ANALYZE ${query.sql}`,
      );
      const plan = rows.map((r) => r['QUERY PLAN']);

      const executionTimeMs = extractExecutionTime(plan);
      const usesIndex = hasIndexUsage(plan);
      const usesSeqScan = hasSeqScan(plan);
      const indexNames = extractIndexNames(plan);
      const warnings: string[] = [];

      if (executionTimeMs > SLOW_QUERY_THRESHOLD_MS) {
        warnings.push(`SLOW: ${executionTimeMs.toFixed(1)}ms exceeds ${SLOW_QUERY_THRESHOLD_MS}ms threshold`);
      }

      if (usesSeqScan && !usesIndex) {
        const rows = getSeqScanRows(plan);
        if (rows > SEQ_SCAN_ROW_THRESHOLD) {
          warnings.push(`SEQ SCAN on ${rows} rows — consider adding an index`);
        }
      }

      results.push({
        name: query.name,
        plan,
        executionTimeMs,
        usesIndex,
        usesSeqScan,
        indexNames,
        warnings,
      });

      // Print result
      const status = warnings.length > 0 ? '⚠' : '✓';
      const indexInfo = usesIndex
        ? `Index: ${indexNames.join(', ') || 'yes'}`
        : usesSeqScan
          ? 'Seq Scan'
          : 'N/A';

      console.log(`${status} ${query.name}`);
      console.log(`  ${query.description}`);
      console.log(`  Time: ${executionTimeMs >= 0 ? executionTimeMs.toFixed(2) + 'ms' : 'N/A'} | ${indexInfo}`);
      if (warnings.length > 0) {
        for (const w of warnings) console.log(`  ⚠ ${w}`);
      }
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Skip queries on tables that may not exist (e.g., empty DB)
      if (message.includes('does not exist')) {
        console.log(`⊘ ${query.name} — table not found (skipped)\n`);
      } else {
        console.log(`✗ ${query.name} — ERROR: ${message}\n`);
      }
      results.push({
        name: query.name,
        plan: [],
        executionTimeMs: -1,
        usesIndex: false,
        usesSeqScan: false,
        indexNames: [],
        warnings: [`ERROR: ${message}`],
      });
    }
  }

  // ── Unused indexes check ────────────────────────────────────

  console.log('───────────────────────────────────────────────────────────');
  console.log('  Unused Indexes (0 scans since last stats reset)');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    const unused = await prisma.$queryRaw<
      Array<{ schemaname: string; relname: string; indexrelname: string; idx_scan: bigint; idx_tup_read: bigint; index_size: string }>
    >`
      SELECT s.schemaname, s.relname, s.indexrelname,
             s.idx_scan, s.idx_tup_read,
             pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
      FROM pg_stat_user_indexes s
      JOIN pg_index i ON s.indexrelid = i.indexrelid
      WHERE s.idx_scan = 0
        AND NOT i.indisunique
        AND NOT i.indisprimary
      ORDER BY pg_relation_size(s.indexrelid) DESC
    `;

    if (unused.length === 0) {
      console.log('  All non-unique indexes have been scanned at least once.\n');
    } else {
      for (const idx of unused) {
        console.log(`  ⚠ ${idx.indexrelname} on ${idx.relname} — ${idx.index_size} (0 scans)`);
      }
      console.log();
    }
  } catch (err) {
    console.log(`  Could not check: ${err instanceof Error ? err.message : err}\n`);
  }

  // ── Duplicate indexes check ──────────────────��──────────────

  console.log('───────────────────────────────────────────────────────────');
  console.log('  Duplicate / Redundant Indexes');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    const duplicates = await prisma.$queryRaw<
      Array<{ table_name: string; index1: string; index2: string; columns1: string; columns2: string }>
    >`
      SELECT a.indrelid::regclass AS table_name,
             a.indexrelid::regclass AS index1,
             b.indexrelid::regclass AS index2,
             pg_get_indexdef(a.indexrelid) AS columns1,
             pg_get_indexdef(b.indexrelid) AS columns2
      FROM pg_index a
      JOIN pg_index b ON a.indrelid = b.indrelid
        AND a.indexrelid <> b.indexrelid
        AND a.indkey::text = LEFT(b.indkey::text, LENGTH(a.indkey::text))
        AND a.indkey::text <> b.indkey::text
      WHERE NOT a.indisunique
        AND NOT a.indisprimary
      ORDER BY a.indrelid::regclass::text
    `;

    if (duplicates.length === 0) {
      console.log('  No redundant indexes detected.\n');
    } else {
      for (const d of duplicates) {
        console.log(`  ⚠ ${d.index1} is a prefix of ${d.index2} on ${d.table_name}`);
      }
      console.log();
    }
  } catch (err) {
    console.log(`  Could not check: ${err instanceof Error ? err.message : err}\n`);
  }

  // ── Table sizes ─────────────────────────────────────────────

  console.log('───────────────────────────────────────────────────────────');
  console.log('  Table Sizes');
  console.log('───────────────────────────────────────────────────────────\n');

  try {
    const sizes = await prisma.$queryRaw<
      Array<{ table_name: string; row_count: bigint; table_size: string; index_size: string; total_size: string }>
    >`
      SELECT relname AS table_name,
             n_live_tup AS row_count,
             pg_size_pretty(pg_table_size(relid)) AS table_size,
             pg_size_pretty(pg_indexes_size(relid)) AS index_size,
             pg_size_pretty(pg_total_relation_size(relid)) AS total_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 20
    `;

    console.log('  Table                    Rows    Data      Indexes   Total');
    console.log('  ─────────────────────────────────────────────────────────');
    for (const t of sizes) {
      const name = t.table_name.padEnd(25);
      const rows = String(t.row_count).padStart(7);
      console.log(`  ${name} ${rows}  ${t.table_size.padStart(8)}  ${t.index_size.padStart(8)}  ${t.total_size.padStart(8)}`);
    }
    console.log();
  } catch (err) {
    console.log(`  Could not check: ${err instanceof Error ? err.message : err}\n`);
  }

  // ── Summary ─────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const total = results.length;
  const passed = results.filter((r) => r.warnings.length === 0).length;
  const slow = results.filter((r) => r.executionTimeMs > SLOW_QUERY_THRESHOLD_MS).length;
  const seqScans = results.filter((r) => r.usesSeqScan && !r.usesIndex).length;
  const errors = results.filter((r) => r.executionTimeMs === -1).length;

  console.log(`  Queries audited: ${total}`);
  console.log(`  Passed:          ${passed}`);
  console.log(`  Slow (>${SLOW_QUERY_THRESHOLD_MS}ms):    ${slow}`);
  console.log(`  Seq scans only:  ${seqScans}`);
  console.log(`  Errors/skipped:  ${errors}`);
  console.log();

  if (slow > 0) {
    console.log('  Slow queries:');
    for (const r of results.filter((r) => r.executionTimeMs > SLOW_QUERY_THRESHOLD_MS)) {
      console.log(`    - ${r.name}: ${r.executionTimeMs.toFixed(1)}ms`);
    }
    console.log();
  }

  if (seqScans > 0) {
    console.log('  Queries using only Seq Scan:');
    for (const r of results.filter((r) => r.usesSeqScan && !r.usesIndex)) {
      console.log(`    - ${r.name}`);
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

// ── Run ─────────────────────────────────────────────────────────

runAudit()
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
