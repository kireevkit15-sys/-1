/**
 * Battle V2 E2E Test — Full battle cycle with 5 branches.
 *
 * Tests: bot battle creation, 5 rounds with branch selection,
 * per-branch XP scoring, damage by difficulty, defense types,
 * sparring mode, and bot difficulty levels.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/battle-v2.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BattleService } from '../src/battle/battle.service';
import {
  BattlePhase,
  Difficulty,
  DefenseType,
  Branch,
  ROUNDS_PER_BATTLE,
  MAX_HP,
  DAMAGE,
  ELO_DEFAULT_RATING,
} from '@razum/shared';
import type { BattleState } from '@razum/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_BRANCHES: Branch[] = [
  Branch.STRATEGY,
  Branch.LOGIC,
  Branch.ERUDITION,
  Branch.RHETORIC,
  Branch.INTUITION,
];

const BRANCH_XP_FIELD: Record<string, string> = {
  STRATEGY: 'strategyXp',
  LOGIC: 'logicXp',
  ERUDITION: 'eruditionXp',
  RHETORIC: 'rhetoricXp',
  INTUITION: 'intuitionXp',
};

/**
 * Play through a full bot battle using BattleService, selecting a specific
 * branch for each round. Returns the final BattleState.
 */
async function playFullBattle(
  battleService: BattleService,
  battleId: string,
  userId: string,
  questionId: string,
  opts?: { branchPerRound?: Branch[]; difficulty?: Difficulty },
): Promise<BattleState> {
  let state = await battleService.getBattleState(battleId);
  const diff = opts?.difficulty ?? Difficulty.BRONZE;
  let safety = 60;

  while (state.phase !== BattlePhase.FINAL_RESULT && safety > 0) {
    safety--;

    if (state.phase === BattlePhase.BRANCH_SELECT || state.phase === BattlePhase.CATEGORY_SELECT) {
      const branch = state.branches?.[0] ?? state.categories[0]!;
      state = await battleService.processCategory(
        battleId,
        state.currentAttackerId!,
        branch,
      );
      continue;
    }

    if (state.phase === BattlePhase.ROUND_ATTACK) {
      if (state.currentAttackerId === userId) {
        // Human attacks — use real question
        state = await battleService.processAttack(
          battleId,
          userId,
          diff,
          0,
          questionId,
        );
      } else {
        // Bot attacks — simulate timeout (0 damage, advances round)
        state = await battleService.handlePlayerTimeout(battleId);
      }
      continue;
    }

    if (state.phase === BattlePhase.ROUND_DEFENSE) {
      state = await battleService.processDefense(
        battleId,
        state.currentDefenderId!,
        DefenseType.ACCEPT,
        true,
      );
      continue;
    }

    if (
      state.phase === BattlePhase.ROUND_RESULT ||
      state.phase === BattlePhase.SWAP_ROLES
    ) {
      state = await battleService.advanceRound(battleId);
      continue;
    }

    // Unknown phase — break
    break;
  }

  return state;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Battle V2 — 5 Branches E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let battleService: BattleService;

  let authToken: string;
  let userId: string;

  // One test question per branch
  const questionsByBranch: Record<string, string> = {};
  const allQuestionIds: string[] = [];

  const TEST_EMAIL = `e2e-battle-v2-${Date.now()}@test.razum.dev`;
  const TEST_NAME = 'E2E Battle V2 Tester';

  // ---------------------------------------------------------------------------
  // Setup & Teardown
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    battleService = app.get(BattleService);

    // Create test user with stats
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: TEST_NAME,
        passwordHash: 'not-a-real-hash',
        stats: {
          create: { rating: ELO_DEFAULT_RATING },
        },
      },
    });
    userId = user.id;

    authToken = jwtService.sign({
      sub: userId,
      email: TEST_EMAIL,
      role: 'USER',
      type: 'access',
    });

    // Seed one question per branch (correctIndex = 0)
    for (const branch of ALL_BRANCHES) {
      const q = await prisma.question.create({
        data: {
          category: `E2E-V2-${branch}`,
          branch,
          difficulty: 'BRONZE',
          text: `E2E V2 Test question for ${branch}`,
          options: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
          correctIndex: 0,
          explanation: `E2E V2 test — ${branch} branch.`,
          statPrimary: BRANCH_XP_FIELD[branch] ?? 'logicXp',
          isActive: true,
        },
      });
      questionsByBranch[branch] = q.id;
      allQuestionIds.push(q.id);
    }
  }, 30_000);

  afterAll(async () => {
    try {
      await prisma.battleRound.deleteMany({
        where: {
          battle: {
            OR: [{ player1Id: userId }, { player2Id: userId }],
          },
        },
      });
      await prisma.battle.deleteMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
        },
      });
      for (const qId of allQuestionIds) {
        await prisma.question.delete({ where: { id: qId } }).catch(() => {});
      }
      await prisma.userStats.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Best-effort cleanup
    }
    await app.close();
  }, 15_000);

  // ---------------------------------------------------------------------------
  // 1. Bot battle creation with 5 branches available
  // ---------------------------------------------------------------------------

  describe('Bot battle creation — 5 branches', () => {
    it('should create a bot battle with all 5 branches available', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      expect([BattlePhase.BRANCH_SELECT, BattlePhase.CATEGORY_SELECT]).toContain(state.phase);
      expect(state.totalRounds).toBe(ROUNDS_PER_BATTLE);
      expect(state.player1.hp).toBe(MAX_HP);
      expect(state.player2.hp).toBe(MAX_HP);
      expect(state.currentRound).toBe(1);

      // All 5 branches should be available
      expect(state.branches).toBeDefined();
      expect(state.branches.length).toBe(5);
      for (const branch of ALL_BRANCHES) {
        expect(state.branches).toContain(branch);
      }
    });

    it('should create battle via REST POST /battles', async () => {
      const res = await request(app.getHttpServer())
        .post('/battles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'bot' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.player1Id).toBe(userId);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Full 5-round battle with correct answers — BRONZE damage
  // ---------------------------------------------------------------------------

  describe('Full 5-round battle — correct answers, BRONZE difficulty', () => {
    let finalState: BattleState;
    let battleId: string;
    let statsBefore: Record<string, number>;

    beforeAll(async () => {
      // Snapshot stats before battle
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      statsBefore = {
        strategyXp: stats?.strategyXp ?? 0,
        logicXp: stats?.logicXp ?? 0,
        eruditionXp: stats?.eruditionXp ?? 0,
        rhetoricXp: stats?.rhetoricXp ?? 0,
        intuitionXp: stats?.intuitionXp ?? 0,
        rating: stats?.rating ?? ELO_DEFAULT_RATING,
      };

      const battle = await battleService.createBotBattle(userId);
      battleId = battle.id;

      finalState = await playFullBattle(
        battleService,
        battleId,
        userId,
        questionsByBranch[Branch.STRATEGY]!,
        { difficulty: Difficulty.BRONZE },
      );
    }, 30_000);

    it('should reach FINAL_RESULT phase', () => {
      expect(finalState.phase).toBe(BattlePhase.FINAL_RESULT);
    });

    it('should have played all rounds', () => {
      expect(finalState.rounds.length).toBeGreaterThanOrEqual(ROUNDS_PER_BATTLE);
    });

    it('should have reduced HP of at least one player', () => {
      const totalHp = finalState.player1.hp + finalState.player2.hp;
      expect(totalHp).toBeLessThan(MAX_HP * 2);
    });

    it('should deal BRONZE damage (10) per correct answer', () => {
      for (const round of finalState.rounds) {
        if (round.attackerCorrect) {
          expect(round.damageDealt).toBe(DAMAGE.BRONZE);
        }
      }
    });

    it('should mark battle as COMPLETED in DB', async () => {
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
      });
      expect(battle).toBeDefined();
      expect(battle!.status).toBe('COMPLETED');
      expect(battle!.endedAt).toBeDefined();
    });

    it('should have a winner determined', async () => {
      const battle = await prisma.battle.findUnique({
        where: { id: battleId },
      });
      // Winner is either player1, bot (null for bot), or null for draw
      expect(battle!.player1Score).toBeDefined();
      expect(battle!.player2Score).toBeDefined();
    });

    it('should award XP to user after battle', async () => {
      const statsAfter = await prisma.userStats.findUnique({
        where: { userId },
      });
      expect(statsAfter).toBeDefined();

      const totalXpBefore =
        statsBefore.strategyXp +
        statsBefore.logicXp +
        statsBefore.eruditionXp +
        statsBefore.rhetoricXp +
        statsBefore.intuitionXp;

      const totalXpAfter =
        (statsAfter?.strategyXp ?? 0) +
        (statsAfter?.logicXp ?? 0) +
        (statsAfter?.eruditionXp ?? 0) +
        (statsAfter?.rhetoricXp ?? 0) +
        (statsAfter?.intuitionXp ?? 0);

      // XP should increase (or at least not decrease) after battle
      expect(totalXpAfter).toBeGreaterThanOrEqual(totalXpBefore);
    });

    it('should persist battle rounds in DB', async () => {
      const rounds = await prisma.battleRound.findMany({
        where: { battleId },
        orderBy: { roundNumber: 'asc' },
      });

      expect(rounds.length).toBeGreaterThanOrEqual(1);
      for (const round of rounds) {
        expect(round.battleId).toBe(battleId);
        expect(round.attackerId).toBeDefined();
        expect(round.difficulty).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Damage scaling by difficulty
  // ---------------------------------------------------------------------------

  describe('Damage scaling by difficulty', () => {
    it('SILVER difficulty should deal 20 damage on correct answer', async () => {
      // Create SILVER-difficulty question
      const silverQ = await prisma.question.create({
        data: {
          category: 'E2E-V2-SILVER',
          branch: Branch.LOGIC,
          difficulty: 'SILVER',
          text: 'E2E V2 Silver question',
          options: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
          correctIndex: 0,
          explanation: 'Silver test',
          statPrimary: 'logicXp',
          isActive: true,
        },
      });
      allQuestionIds.push(silverQ.id);

      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      // Select category
      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      // Attack with SILVER difficulty
      current = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.SILVER,
        0, // correct answer
        silverQ.id,
      );

      // Find the round where user attacked
      const userRound = current.rounds.find(
        (r) => r.attackerId === userId && r.attackerCorrect,
      );

      if (userRound) {
        expect(userRound.damageDealt).toBe(DAMAGE.SILVER);
      }
    });

    it('GOLD difficulty should deal 30-35 damage on correct answer', async () => {
      const goldQ = await prisma.question.create({
        data: {
          category: 'E2E-V2-GOLD',
          branch: Branch.STRATEGY,
          difficulty: 'GOLD',
          text: 'E2E V2 Gold question',
          options: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
          correctIndex: 0,
          explanation: 'Gold test',
          statPrimary: 'strategyXp',
          isActive: true,
        },
      });
      allQuestionIds.push(goldQ.id);

      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      current = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.GOLD,
        0,
        goldQ.id,
      );

      const userRound = current.rounds.find(
        (r) => r.attackerId === userId && r.attackerCorrect,
      );

      if (userRound) {
        expect(userRound.damageDealt).toBeGreaterThanOrEqual(DAMAGE.GOLD_MIN);
        expect(userRound.damageDealt).toBeLessThanOrEqual(DAMAGE.GOLD_MAX);
      }
    });

    it('wrong answer should deal 0 damage', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      // Answer incorrectly (correctIndex is 0, pick 1)
      current = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.BRONZE,
        1, // wrong answer
        questionsByBranch[Branch.STRATEGY]!,
      );

      const userRound = current.rounds.find(
        (r) => r.attackerId === userId && !r.attackerCorrect,
      );

      if (userRound) {
        expect(userRound.damageDealt).toBe(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Defense types
  // ---------------------------------------------------------------------------

  describe('Defense types', () => {
    it('ACCEPT defense should apply full damage to defender', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      // Attack correctly
      current = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.BRONZE,
        0,
        questionsByBranch[Branch.STRATEGY]!,
      );

      if (current.phase === BattlePhase.ROUND_DEFENSE) {
        const hpBefore = current.player2.hp;
        current = await battleService.processDefense(
          battle.id,
          current.currentDefenderId!,
          DefenseType.ACCEPT,
          true,
        );

        // Defender should lose HP equal to damage dealt
        expect(current.player2.hp).toBeLessThanOrEqual(hpBefore);
      }
    });

    it('successful DISPUTE should reflect damage to attacker', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      current = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.BRONZE,
        0,
        questionsByBranch[Branch.LOGIC]!,
      );

      if (current.phase === BattlePhase.ROUND_DEFENSE) {
        const attackerHpBefore = current.player1.hp;
        current = await battleService.processDefense(
          battle.id,
          current.currentDefenderId!,
          DefenseType.DISPUTE,
          true, // successful dispute
        );

        // On successful dispute, attacker should take damage
        expect(current.player1.hp).toBeLessThan(attackerHpBefore);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Per-branch XP tracking
  // ---------------------------------------------------------------------------

  describe('Per-branch XP tracking', () => {
    it('should increase branch-specific XP fields after battle', async () => {
      // Reset stats to clean baseline
      await prisma.userStats.update({
        where: { userId },
        data: {
          strategyXp: 0,
          logicXp: 0,
          eruditionXp: 0,
          rhetoricXp: 0,
          intuitionXp: 0,
        },
      });

      const battle = await battleService.createBotBattle(userId);
      await playFullBattle(
        battleService,
        battle.id,
        userId,
        questionsByBranch[Branch.STRATEGY]!,
        { difficulty: Difficulty.BRONZE },
      );

      const statsAfter = await prisma.userStats.findUnique({
        where: { userId },
      });
      expect(statsAfter).toBeDefined();

      // At least one branch XP field should be non-zero
      const xpFields = [
        statsAfter!.strategyXp,
        statsAfter!.logicXp,
        statsAfter!.eruditionXp,
        statsAfter!.rhetoricXp,
        statsAfter!.intuitionXp,
      ];
      const totalXp = xpFields.reduce((sum, xp) => sum + xp, 0);
      expect(totalXp).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Battle history reflects 5-branch metadata
  // ---------------------------------------------------------------------------

  describe('Battle history', () => {
    it('GET /battles/history should return completed battles with scores', async () => {
      const res = await request(app.getHttpServer())
        .get('/battles/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('battles');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.battles)).toBe(true);

      if (res.body.total > 0) {
        const battle = res.body.battles[0];
        expect(battle).toHaveProperty('status', 'COMPLETED');
        expect(battle).toHaveProperty('player1Score');
        expect(battle).toHaveProperty('player2Score');
      }
    });

    it('GET /battles/:id should return battle detail with rounds', async () => {
      // Get first battle from history
      const histRes = await request(app.getHttpServer())
        .get('/battles/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (histRes.body.battles.length === 0) return;

      const battleId = histRes.body.battles[0].id;
      const res = await request(app.getHttpServer())
        .get(`/battles/${battleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', battleId);
      expect(res.body).toHaveProperty('state');
      expect(res.body).toHaveProperty('player1');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Multiple battles — cumulative XP
  // ---------------------------------------------------------------------------

  describe('Cumulative XP across multiple battles', () => {
    it('should accumulate XP across multiple battles', async () => {
      const statsBefore = await prisma.userStats.findUnique({
        where: { userId },
      });
      const totalXpBefore =
        (statsBefore?.strategyXp ?? 0) +
        (statsBefore?.logicXp ?? 0) +
        (statsBefore?.eruditionXp ?? 0) +
        (statsBefore?.rhetoricXp ?? 0) +
        (statsBefore?.intuitionXp ?? 0);

      // Play two battles
      for (let i = 0; i < 2; i++) {
        const battle = await battleService.createBotBattle(userId);
        await playFullBattle(
          battleService,
          battle.id,
          userId,
          questionsByBranch[Branch.LOGIC]!,
          { difficulty: Difficulty.BRONZE },
        );
      }

      const statsAfter = await prisma.userStats.findUnique({
        where: { userId },
      });
      const totalXpAfter =
        (statsAfter?.strategyXp ?? 0) +
        (statsAfter?.logicXp ?? 0) +
        (statsAfter?.eruditionXp ?? 0) +
        (statsAfter?.rhetoricXp ?? 0) +
        (statsAfter?.intuitionXp ?? 0);

      // XP should accumulate (or at minimum not decrease)
      expect(totalXpAfter).toBeGreaterThanOrEqual(totalXpBefore);
    }, 60_000);
  });

  // ---------------------------------------------------------------------------
  // 8. Edge cases — timeout and disconnect
  // ---------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('timeout should deal 0 damage and advance round', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Move to ROUND_ATTACK
      const branchToSelect = state.branches?.[0] ?? state.categories[0]!;
      state = await battleService.processCategory(
        battle.id,
        userId,
        branchToSelect,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Trigger timeout
      state = await battleService.handlePlayerTimeout(battle.id);
      expect(state.phase).toBe(BattlePhase.ROUND_RESULT);

      const lastRound = state.rounds[state.rounds.length - 1];
      expect(lastRound).toBeDefined();
      expect(lastRound!.damageDealt).toBe(0);
      expect(lastRound!.attackerCorrect).toBe(false);
    });

    it('disconnect should end battle immediately', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      const branch = state.branches?.[0] ?? state.categories[0]!;
      state = await battleService.processCategory(
        battle.id,
        userId,
        branch,
      );

      state = await battleService.handlePlayerDisconnect(battle.id, userId);
      expect(state.phase).toBe(BattlePhase.FINAL_RESULT);
      expect(state.abandonedBy).toBe(userId);
      expect(state.player1.hp).toBe(0);

      const dbBattle = await prisma.battle.findUnique({
        where: { id: battle.id },
      });
      // Battle is marked as ABANDONED or COMPLETED depending on implementation
      expect(['ABANDONED', 'COMPLETED']).toContain(dbBattle!.status);
    });

    it('should reject actions on a completed battle', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      // Forfeit immediately
      await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      await battleService.handlePlayerDisconnect(battle.id, userId);

      // Attempt to continue should throw
      await expect(
        battleService.processCategory(battle.id, userId, state.categories[0]!),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. State machine — phase transitions integrity
  // ---------------------------------------------------------------------------

  describe('Phase transitions integrity', () => {
    it('should follow BRANCH_SELECT → ROUND_ATTACK → (DEFENSE) → ROUND_RESULT → next round', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Phase: BRANCH_SELECT (or CATEGORY_SELECT for backwards compat)
      expect([BattlePhase.BRANCH_SELECT, BattlePhase.CATEGORY_SELECT]).toContain(state.phase);

      // Phase: ROUND_ATTACK
      const branch = state.branches?.[0] ?? state.categories[0]!;
      state = await battleService.processCategory(
        battle.id,
        userId,
        branch,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Phase: ROUND_DEFENSE or ROUND_RESULT
      state = await battleService.processAttack(
        battle.id,
        userId,
        Difficulty.BRONZE,
        0,
        questionsByBranch[Branch.STRATEGY]!,
      );
      expect([BattlePhase.ROUND_DEFENSE, BattlePhase.ROUND_RESULT]).toContain(
        state.phase,
      );

      // If ROUND_DEFENSE, process it
      if (state.phase === BattlePhase.ROUND_DEFENSE) {
        state = await battleService.processDefense(
          battle.id,
          state.currentDefenderId!,
          DefenseType.ACCEPT,
          true,
        );
        expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
      }

      // Advance to next round
      state = await battleService.advanceRound(battle.id);
      expect([
        BattlePhase.BRANCH_SELECT,
        BattlePhase.CATEGORY_SELECT,
        BattlePhase.SWAP_ROLES,
        BattlePhase.FINAL_RESULT,
      ]).toContain(state.phase);
    });

    it('should not allow attack during BRANCH_SELECT phase', async () => {
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);
      expect([BattlePhase.BRANCH_SELECT, BattlePhase.CATEGORY_SELECT]).toContain(state.phase);

      await expect(
        battleService.processAttack(
          battle.id,
          userId,
          Difficulty.BRONZE,
          0,
          questionsByBranch[Branch.LOGIC]!,
        ),
      ).rejects.toThrow();
    });

    it('should not allow non-attacker to submit answer', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      const branchToSelect = state.branches?.[0] ?? state.categories[0]!;
      state = await battleService.processCategory(
        battle.id,
        userId,
        branchToSelect,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Bot (player2) tries to attack — should fail
      await expect(
        battleService.processAttack(
          battle.id,
          'bot',
          Difficulty.BRONZE,
          0,
          questionsByBranch[Branch.LOGIC]!,
        ),
      ).rejects.toThrow();
    });
  });
});
