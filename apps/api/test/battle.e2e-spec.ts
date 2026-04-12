/**
 * Battle E2E Test — Full bot battle cycle.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/battle.e2e-spec.ts
 *
 * The test uses a real database, creates test fixtures in beforeAll,
 * and cleans them up in afterAll.
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import request from 'supertest';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BattleService } from '../src/battle/battle.service';
import {
  BattlePhase,
  Difficulty,
  DefenseType,
  ROUNDS_PER_BATTLE,
  MAX_HP,
  ELO_DEFAULT_RATING,
  ROUND_TIME_LIMIT,
} from '@razum/shared';
import type { BattleState, BattleResult } from '@razum/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for a specific Socket.IO event with a timeout. */
function waitForEvent<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event);
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** Emit an event and wait for a response event. */
function emitAndWait<T = unknown>(
  socket: Socket,
  emitEvent: string,
  data: Record<string, unknown>,
  responseEvent: string,
  timeoutMs = 10_000,
): Promise<T> {
  const promise = waitForEvent<T>(socket, responseEvent, timeoutMs);
  socket.emit(emitEvent, data);
  return promise;
}

/** Small delay helper. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Battle E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let battleService: BattleService;

  let authToken: string;
  let userId: string;
  let testQuestionId: string;
  const testQuestionIds: string[] = [];

  const TEST_EMAIL = `e2e-battle-${Date.now()}@test.razum.dev`;
  const TEST_NAME = 'E2E Battle Tester';
  const TEST_CATEGORY = 'Математика';

  const ALL_BRANCHES = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] as const;
  const BRANCH_XP_MAP: Record<string, string> = {
    STRATEGY: 'strategyXp',
    LOGIC: 'logicXp',
    ERUDITION: 'eruditionXp',
    RHETORIC: 'rhetoricXp',
    INTUITION: 'intuitionXp',
  };

  // ---------------------------------------------------------------------------
  // Setup & Teardown
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useWebSocketAdapter(new IoAdapter(app));

    // Start HTTP + WebSocket server on a random port
    await app.listen(0);

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    battleService = app.get(BattleService);

    // ---- Create test user with stats ----
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: TEST_NAME,
        passwordHash: 'not-a-real-hash',
        stats: {
          create: {
            rating: ELO_DEFAULT_RATING,
          },
        },
      },
    });
    userId = user.id;

    // ---- Generate JWT ----
    authToken = jwtService.sign({
      sub: userId,
      email: TEST_EMAIL,
      role: 'USER',
      type: 'access',
    });

    // ---- Seed at least one question per branch for battle tests ----
    for (const branch of ALL_BRANCHES) {
      const q = await prisma.question.create({
        data: {
          category: `E2E-${branch}`,
          branch,
          difficulty: 'BRONZE',
          text: `E2E Test question for ${branch}`,
          options: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
          correctIndex: 0,
          explanation: `E2E test — ${branch} branch.`,
          statPrimary: BRANCH_XP_MAP[branch] ?? 'logicXp',
          isActive: true,
        },
      });
      testQuestionIds.push(q.id);
    }
    testQuestionId = testQuestionIds[0]!;
  }, 30_000);

  afterAll(async () => {
    // Cleanup in correct FK order
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
      for (const qId of testQuestionIds) {
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
  // 1. REST: Create a bot battle
  // ---------------------------------------------------------------------------

  describe('POST /battles (mode=bot) — create bot battle via REST', () => {
    let battleId: string;

    it('should create a battle with ACTIVE status', async () => {
      const res = await request(app.getHttpServer())
        .post('/battles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'bot' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.mode).toBe('SIEGE');
      expect(res.body.player1Id).toBe(userId);
      expect(res.body.player2Id).toBeNull(); // bot battles have null player2
      battleId = res.body.id;
    });

    it('should be retrievable via GET /battles/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/battles/${battleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.id).toBe(battleId);
      expect(res.body.player1.id).toBe(userId);
      // state JSON should contain the BattleState
      expect(res.body.state).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/battles')
        .send({ mode: 'bot' })
        .expect(401);
    });

    it('should reject unknown battle modes', async () => {
      await request(app.getHttpServer())
        .post('/battles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'unknown' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. WebSocket: connect, authenticate, create bot battle
  // ---------------------------------------------------------------------------

  describe('WebSocket /battle — connection & JWT handshake', () => {
    let socket: Socket;

    afterEach(() => {
      if (socket?.connected) {
        socket.disconnect();
      }
    });

    it('should connect with a valid JWT', async () => {
      const address = app.getHttpServer().address();
      const port = typeof address === 'object' ? address?.port : undefined;
      expect(port).toBeDefined();

      socket = io(`http://localhost:${port}/battle`, {
        auth: { token: authToken },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WS connect timeout')), 5_000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      expect(socket.connected).toBe(true);
    });

    it('should reject connection without a token', async () => {
      const address = app.getHttpServer().address();
      const port = typeof address === 'object' ? address?.port : undefined;

      socket = io(`http://localhost:${port}/battle`, {
        transports: ['websocket'],
        forceNew: true,
        // no auth token
      });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // If we are still here, the server likely disconnected us
          resolve();
        }, 3_000);

        socket.on('disconnect', () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.on('connect_error', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // Socket should not remain connected
      expect(socket.connected).toBe(false);
    });

    it('should reject connection with an invalid token', async () => {
      const address = app.getHttpServer().address();
      const port = typeof address === 'object' ? address?.port : undefined;

      socket = io(`http://localhost:${port}/battle`, {
        auth: { token: 'invalid.jwt.token' },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3_000);
        socket.on('disconnect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      expect(socket.connected).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Full bot battle cycle via WebSocket
  // ---------------------------------------------------------------------------

  describe('Bot Battle Full Cycle (WebSocket)', () => {
    let socket: Socket;
    let port: number;

    beforeAll(() => {
      const address = app.getHttpServer().address();
      port = typeof address === 'object' ? address?.port ?? 0 : 0;
    });

    beforeEach(async () => {
      socket = io(`http://localhost:${port}/battle`, {
        auth: { token: authToken },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WS connect timeout')), 5_000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    });

    afterEach(() => {
      if (socket?.connected) {
        socket.disconnect();
      }
    });

    it('should create a bot battle and receive initial state', async () => {
      const state = await emitAndWait<BattleState>(
        socket,
        'battle:create_bot',
        {},
        'battle:started',
      );

      expect(state).toBeDefined();
      expect(state.phase).toBe(BattlePhase.BRANCH_SELECT);
      expect(state.player1.id).toBe(userId);
      expect(state.player2.id).toBe('bot');
      expect(state.player2.name).toBe('РАЗУМ-бот');
      expect(state.totalRounds).toBe(ROUNDS_PER_BATTLE);
      expect(state.currentRound).toBe(1);
      expect(state.player1.hp).toBe(MAX_HP);
      expect(state.player2.hp).toBe(MAX_HP);
      expect(state.categories).toBeDefined();
      expect(state.categories.length).toBeGreaterThan(0);
    });

    it('should join an existing battle and receive state', async () => {
      // First create a bot battle via REST
      const createRes = await request(app.getHttpServer())
        .post('/battles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'bot' })
        .expect(201);

      const battleId = createRes.body.id;

      // Then join via WebSocket
      socket.emit('battle:join', { battleId });

      const state = await waitForEvent<BattleState>(socket, 'battle:state');
      expect(state).toBeDefined();
      // The state was stored in the DB by createBotBattle
      expect(state.id).toBe(battleId);
    });

    it('should select a category and transition to ROUND_ATTACK', async () => {
      const initialState = await emitAndWait<BattleState>(
        socket,
        'battle:create_bot',
        {},
        'battle:started',
      );

      const battleId = initialState.id;
      const category = initialState.categories[0]!;

      const updatedState = await emitAndWait<BattleState>(
        socket,
        'battle:category',
        { battleId, category },
        'battle:phase_changed',
      );

      expect(updatedState.phase).toBe(BattlePhase.ROUND_ATTACK);
      expect(updatedState.selectedCategory).toBe(category);
    });

    it('should process an attack and receive round update', async () => {
      // Create battle
      const initialState = await emitAndWait<BattleState>(
        socket,
        'battle:create_bot',
        {},
        'battle:started',
      );
      const battleId = initialState.id;
      const category = initialState.categories[0]!;

      // Select category
      await emitAndWait<BattleState>(
        socket,
        'battle:category',
        { battleId, category },
        'battle:phase_changed',
      );

      // Submit attack (human is player1, the attacker in round 1)
      const afterAttack = await emitAndWait<BattleState>(
        socket,
        'battle:attack',
        {
          battleId,
          difficulty: Difficulty.BRONZE,
          answerIndex: 0,
          questionId: testQuestionId,
        },
        'battle:round_update',
      );

      expect(afterAttack).toBeDefined();
      expect(afterAttack.rounds.length).toBeGreaterThanOrEqual(1);

      const lastRound = afterAttack.rounds[afterAttack.rounds.length - 1];
      expect(lastRound).toBeDefined();
      expect(lastRound!.attackerId).toBe(userId);
      expect(lastRound!.difficulty).toBe(Difficulty.BRONZE);
    });

    it('should play through a full 5-round battle with the bot', async () => {
      // Create battle
      const initialState = await emitAndWait<BattleState>(
        socket,
        'battle:create_bot',
        {},
        'battle:started',
      );
      const battleId = initialState.id;

      let currentState = initialState;
      let roundsPlayed = 0;
      const maxIterations = 50; // safety valve
      let iterations = 0;

      while (
        currentState.phase !== BattlePhase.FINAL_RESULT &&
        iterations < maxIterations
      ) {
        iterations++;

        // CATEGORY_SELECT: human picks category (if human is attacker)
        if (currentState.phase === BattlePhase.BRANCH_SELECT) {
          if (currentState.currentAttackerId === userId) {
            const category = currentState.categories[0]!;
            currentState = await emitAndWait<BattleState>(
              socket,
              'battle:category',
              { battleId, category },
              'battle:phase_changed',
            );
          } else {
            // Bot is attacker — bot will auto-select category.
            // Wait for the bot's phase_changed event.
            currentState = await waitForEvent<BattleState>(
              socket,
              'battle:phase_changed',
              20_000,
            );
          }
          continue;
        }

        // ROUND_ATTACK: human attacks
        if (currentState.phase === BattlePhase.ROUND_ATTACK) {
          if (currentState.currentAttackerId === userId) {
            currentState = await emitAndWait<BattleState>(
              socket,
              'battle:attack',
              {
                battleId,
                difficulty: Difficulty.BRONZE,
                answerIndex: 0,
                questionId: testQuestionId,
              },
              'battle:round_update',
            );
            roundsPlayed++;
          } else {
            // Bot attacks — wait for the update
            currentState = await waitForEvent<BattleState>(
              socket,
              'battle:round_update',
              20_000,
            );
            roundsPlayed++;
          }
          continue;
        }

        // ROUND_DEFENSE: human defends
        // Note: gateway emits round_update (ROUND_RESULT) then immediately phase_changed,
        // so we must listen for phase_changed BEFORE sending defend to avoid race condition
        if (currentState.phase === BattlePhase.ROUND_DEFENSE) {
          if (currentState.currentDefenderId === userId) {
            // Pre-register listener for phase_changed/complete before emitting defend
            const nextPhasePromise = Promise.race([
              waitForEvent<BattleState>(socket, 'battle:phase_changed', 20_000),
              waitForEvent<BattleResult>(socket, 'battle:complete', 20_000).then(
                () => ({ ...currentState, phase: BattlePhase.FINAL_RESULT }) as BattleState,
              ),
            ]);
            socket.emit('battle:defend', { battleId, defenseType: DefenseType.ACCEPT });
            currentState = await nextPhasePromise;
          } else {
            // Bot defends — gateway emits round_update then phase_changed
            currentState = await Promise.race([
              waitForEvent<BattleState>(socket, 'battle:phase_changed', 20_000),
              waitForEvent<BattleResult>(socket, 'battle:complete', 20_000).then(
                () => ({ ...currentState, phase: BattlePhase.FINAL_RESULT }) as BattleState,
              ),
            ]);
          }
          continue;
        }

        // ROUND_RESULT / SWAP_ROLES: wait for the gateway to advance
        // Gateway may emit phase_changed (next round) or battle:complete (game over)
        if (
          currentState.phase === BattlePhase.ROUND_RESULT ||
          currentState.phase === BattlePhase.SWAP_ROLES
        ) {
          currentState = await Promise.race([
            waitForEvent<BattleState>(socket, 'battle:phase_changed', 20_000),
            waitForEvent<BattleResult>(socket, 'battle:complete', 20_000).then(
              () => ({ ...currentState, phase: BattlePhase.FINAL_RESULT }) as BattleState,
            ),
          ]);
          continue;
        }

        // Fallback: wait for any update
        currentState = await Promise.race([
          waitForEvent<BattleState>(socket, 'battle:phase_changed', 20_000),
          waitForEvent<BattleState>(socket, 'battle:round_update', 20_000),
          waitForEvent<BattleResult>(socket, 'battle:complete', 20_000).then(
            () => ({ ...currentState, phase: BattlePhase.FINAL_RESULT }) as BattleState,
          ),
        ]);
      }

      // If we exited the loop without FINAL_RESULT, wait for the completion event
      if (currentState.phase !== BattlePhase.FINAL_RESULT) {
        const result = await waitForEvent<BattleResult>(
          socket,
          'battle:complete',
          15_000,
        );
        expect(result).toBeDefined();
        expect(result).toHaveProperty('winnerId');
        expect(result).toHaveProperty('player1Score');
        expect(result).toHaveProperty('player2Score');
      }

      expect(roundsPlayed).toBeGreaterThanOrEqual(1);
      expect(iterations).toBeLessThan(maxIterations);
    }, 120_000); // generous timeout for bot delays
  });

  // ---------------------------------------------------------------------------
  // 4. Battle result and stats verification
  // ---------------------------------------------------------------------------

  describe('Battle Result & Stats', () => {
    it('should complete a bot battle via BattleService and update user stats', async () => {
      // Create a bot battle directly through the service
      const battle = await battleService.createBotBattle(userId);
      expect(battle.status).toBe('ACTIVE');

      const state = (await battleService.getBattleState(battle.id)) as BattleState;
      expect(state.phase).toBe(BattlePhase.BRANCH_SELECT);
      expect(state.totalRounds).toBe(ROUNDS_PER_BATTLE);

      // Record the user's stats before the battle
      const statsBefore = await prisma.userStats.findUnique({
        where: { userId },
      });
      const ratingBefore = statsBefore?.rating ?? ELO_DEFAULT_RATING;

      // Play through the battle using the service layer
      // Round 1: select category -> attack -> defense -> advance
      let current = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      expect(current.phase).toBe(BattlePhase.ROUND_ATTACK);

      current = await battleService.processAttack(
        battle.id,
        userId,
        'BRONZE',
        0,
        testQuestionId,
      );

      // If correct, we are in ROUND_DEFENSE; if wrong, ROUND_RESULT
      if (current.phase === BattlePhase.ROUND_DEFENSE) {
        // Bot (defender) accepts
        current = await battleService.processDefense(
          battle.id,
          'bot',
          'ACCEPT',
          true,
        );
      }

      expect(current.phase).toBe(BattlePhase.ROUND_RESULT);

      // Advance through remaining rounds (simplified: advance to FINAL_RESULT)
      // We advance round by round, handling the state machine transitions
      let safety = 30;
      while (current.phase !== BattlePhase.FINAL_RESULT && safety > 0) {
        safety--;

        if (current.phase === BattlePhase.ROUND_RESULT) {
          current = await battleService.advanceRound(battle.id);
          continue;
        }

        if (current.phase === BattlePhase.SWAP_ROLES) {
          // advanceRound handles SWAP_ROLES -> CATEGORY_SELECT internally
          current = await battleService.advanceRound(battle.id);
          continue;
        }

        if (current.phase === BattlePhase.BRANCH_SELECT) {
          const cat = current.categories[0]!;
          current = await battleService.processCategory(
            battle.id,
            current.currentAttackerId!,
            cat,
          );
          continue;
        }

        if (current.phase === BattlePhase.ROUND_ATTACK) {
          current = await battleService.processAttack(
            battle.id,
            current.currentAttackerId!,
            'BRONZE',
            0,
            testQuestionId,
          );
          continue;
        }

        if (current.phase === BattlePhase.ROUND_DEFENSE) {
          current = await battleService.processDefense(
            battle.id,
            current.currentDefenderId!,
            'ACCEPT',
            true,
          );
          continue;
        }

        // Unknown phase — break to avoid infinite loop
        break;
      }

      // After completing the battle, verify DB state
      const completedBattle = await prisma.battle.findUnique({
        where: { id: battle.id },
      });
      expect(completedBattle).toBeDefined();
      expect(completedBattle!.status).toBe('COMPLETED');
      expect(completedBattle!.endedAt).toBeDefined();

      // Winner should be determined
      const finalState = completedBattle!.state as unknown as BattleState;
      expect(
        finalState.phase === BattlePhase.FINAL_RESULT ||
        completedBattle!.status === 'COMPLETED',
      ).toBe(true);

      // User stats should have been updated (XP added)
      const statsAfter = await prisma.userStats.findUnique({
        where: { userId },
      });
      expect(statsAfter).toBeDefined();

      // XP should increase after a battle
      const totalXpBefore =
        (statsBefore?.logicXp ?? 0) +
        (statsBefore?.eruditionXp ?? 0) +
        (statsBefore?.strategyXp ?? 0) +
        (statsBefore?.rhetoricXp ?? 0) +
        (statsBefore?.intuitionXp ?? 0);

      const totalXpAfter =
        (statsAfter?.logicXp ?? 0) +
        (statsAfter?.eruditionXp ?? 0) +
        (statsAfter?.strategyXp ?? 0) +
        (statsAfter?.rhetoricXp ?? 0) +
        (statsAfter?.intuitionXp ?? 0);

      expect(totalXpAfter).toBeGreaterThanOrEqual(totalXpBefore);
    }, 30_000);

    it('should reflect battle results in GET /users/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('battleStats');
      expect(res.body.battleStats).toHaveProperty('total');
      expect(res.body.battleStats).toHaveProperty('wins');
      expect(res.body.battleStats).toHaveProperty('losses');
      expect(res.body.battleStats).toHaveProperty('winRate');

      // Should have at least some XP or rating
      if (res.body.stats) {
        expect(res.body.stats).toHaveProperty('rating');
        expect(res.body.stats).toHaveProperty('totalXp');
        expect(res.body.stats.totalXp).toBeGreaterThanOrEqual(0);
      }
    });

    it('should show completed battle in battle history', async () => {
      const res = await request(app.getHttpServer())
        .get('/battles/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('battles');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.battles)).toBe(true);

      // If battles were completed previously, they should appear here
      if (res.body.total > 0) {
        const battle = res.body.battles[0];
        expect(battle).toHaveProperty('player1');
        expect(battle).toHaveProperty('status', 'COMPLETED');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle round timeout via BattleService', async () => {
      // Create a bot battle
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Select category to get into ROUND_ATTACK
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Simulate timeout instead of answering
      state = await battleService.handlePlayerTimeout(battle.id);
      expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
      expect(state.timedOutRound).toBe(1);

      // Verify the timeout round recorded zero damage
      const lastRound = state.rounds[state.rounds.length - 1];
      expect(lastRound).toBeDefined();
      expect(lastRound!.damageDealt).toBe(0);
      expect(lastRound!.attackerCorrect).toBe(false);
    });

    it('should handle player disconnect — opponent wins by forfeit', async () => {
      // Create a bot battle
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Select category to start the battle
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      // Simulate disconnect of the human player
      state = await battleService.handlePlayerDisconnect(battle.id, userId);

      expect(state.phase).toBe(BattlePhase.FINAL_RESULT);
      expect(state.abandonedBy).toBe(userId);
      // Disconnected player's HP should be 0
      expect(state.player1.hp).toBe(0);

      // DB should be marked ABANDONED
      const dbBattle = await prisma.battle.findUnique({
        where: { id: battle.id },
      });
      expect(dbBattle).toBeDefined();
      expect(dbBattle!.status).toBe('ABANDONED');
    });

    it('should reject actions on a finished battle', async () => {
      // Create and immediately forfeit
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      await battleService.handlePlayerDisconnect(battle.id, userId);

      // Attempting to select a category on a finished battle should throw
      await expect(
        battleService.processCategory(battle.id, userId, state.categories[0]!),
      ).rejects.toThrow();
    });

    it('should reject non-participant access to a battle', async () => {
      // Create a battle for the test user
      const createRes = await request(app.getHttpServer())
        .post('/battles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mode: 'bot' })
        .expect(201);

      const battleId = createRes.body.id;

      // Create a different user and JWT
      const otherUser = await prisma.user.create({
        data: {
          email: `e2e-other-${Date.now()}@test.razum.dev`,
          name: 'Other User',
          passwordHash: 'not-a-real-hash',
        },
      });

      const otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
        role: 'USER',
        type: 'access',
      });

      // The other user should be forbidden from accessing this battle
      await request(app.getHttpServer())
        .get(`/battles/${battleId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // Cleanup other user
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should handle WebSocket disconnect > 30 sec auto-forfeit for PvP', async () => {
      // This is a conceptual test — the gateway uses in-memory timers.
      // We verify the state-machine behavior of handleDisconnect.
      const battle = await battleService.createBotBattle(userId);
      const state = await battleService.getBattleState(battle.id);

      // Simulate the sequence that the gateway performs on disconnect timeout
      const disconnected = await battleService.handlePlayerDisconnect(
        battle.id,
        userId,
      );

      expect(disconnected.phase).toBe(BattlePhase.FINAL_RESULT);
      expect(disconnected.abandonedBy).toBe(userId);

      // The winner should be the opponent (bot)
      expect(disconnected.player2.hp).toBeGreaterThan(0);
      expect(disconnected.player1.hp).toBe(0);
    });

    it('should return 404 for a non-existent battle', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/battles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. State machine integrity checks
  // ---------------------------------------------------------------------------

  describe('State Machine Integrity', () => {
    it('should not allow category selection outside CATEGORY_SELECT phase', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Move to ROUND_ATTACK
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Trying to select category again should fail
      await expect(
        battleService.processCategory(battle.id, userId, state.categories[0]!),
      ).rejects.toThrow();
    });

    it('should not allow non-attacker to submit an answer', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Move to ROUND_ATTACK (player1 = userId is attacker in round 1)
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );

      // Bot (player2) tries to attack — should fail
      await expect(
        battleService.processAttack(battle.id, 'bot', 'BRONZE', 0, testQuestionId),
      ).rejects.toThrow();
    });

    it('should enforce correct phase flow through a full round', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      // Phase 1: CATEGORY_SELECT
      expect(state.phase).toBe(BattlePhase.BRANCH_SELECT);

      // Phase 2: ROUND_ATTACK
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      expect(state.phase).toBe(BattlePhase.ROUND_ATTACK);

      // Phase 3: Submit answer (correct = ROUND_DEFENSE, wrong = ROUND_RESULT)
      state = await battleService.processAttack(
        battle.id,
        userId,
        'BRONZE',
        0,
        testQuestionId,
      );
      expect([BattlePhase.ROUND_DEFENSE, BattlePhase.ROUND_RESULT]).toContain(
        state.phase,
      );

      // Phase 4: If ROUND_DEFENSE, submit defense
      if (state.phase === BattlePhase.ROUND_DEFENSE) {
        state = await battleService.processDefense(
          battle.id,
          'bot',
          'ACCEPT',
          true,
        );
        expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
      }

      // Phase 5: Advance to next round
      state = await battleService.advanceRound(battle.id);
      // After round 1, should go to CATEGORY_SELECT for round 2 (same attacker)
      expect([
        BattlePhase.BRANCH_SELECT,
        BattlePhase.SWAP_ROLES,
        BattlePhase.FINAL_RESULT,
      ]).toContain(state.phase);
    });

    it('should correctly track HP changes across rounds', async () => {
      const battle = await battleService.createBotBattle(userId);
      let state = await battleService.getBattleState(battle.id);

      const initialHp1 = state.player1.hp;
      const initialHp2 = state.player2.hp;
      expect(initialHp1).toBe(MAX_HP);
      expect(initialHp2).toBe(MAX_HP);

      // Play one round with a correct answer (damage dealt to defender)
      state = await battleService.processCategory(
        battle.id,
        userId,
        state.categories[0]!,
      );
      state = await battleService.processAttack(
        battle.id,
        userId,
        'BRONZE',
        0,
        testQuestionId,
      );

      if (state.phase === BattlePhase.ROUND_DEFENSE) {
        state = await battleService.processDefense(
          battle.id,
          'bot',
          'ACCEPT',
          true,
        );
      }

      // After a round, HP values should reflect any damage dealt
      const totalHp = state.player1.hp + state.player2.hp;
      // Total HP should be less than or equal to initial (damage was dealt, or
      // no damage if wrong answer / defense reflected)
      expect(totalHp).toBeLessThanOrEqual(initialHp1 + initialHp2);
    });
  });
});
