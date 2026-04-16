/**
 * Stats + Leaderboard E2E Test — XP, levels, thinkerClass, leaderboard, position.
 *
 * BT.5 + BT.6
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/stats.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StatsService } from '../src/stats/stats.service';
import { LeaderboardService } from '../src/stats/leaderboard.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('Stats + Leaderboard E2E (BT.5 + BT.6)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let statsService: StatsService;
  let leaderboardService: LeaderboardService;

  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    statsService = app.get(StatsService);
    leaderboardService = app.get(LeaderboardService);

    // Register user (auto-creates UserStats with defaults)
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-stats-${Date.now()}@test.com`,
        password: 'Stats123!',
        name: 'E2E Stats User',
      })
      .expect(201);

    userToken = userRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(userToken.split('.')[1]!, 'base64').toString(),
    );
    userId = payload.sub;
  });

  afterAll(async () => {
    await prisma.userStats
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-stats-' } } })
      .catch(() => {});
    await app.close();
  });

  // ═════════���════════════════════════════════════
  // 1. GET MY STATS (fresh user — all zeros)
  // ════���═════════════════════════════════════════

  describe('My Stats (initial)', () => {
    it('GET /stats/me — should return stats with zero XP', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('logicXp', 0);
      expect(res.body).toHaveProperty('eruditionXp', 0);
      expect(res.body).toHaveProperty('strategyXp', 0);
      expect(res.body).toHaveProperty('rhetoricXp', 0);
      expect(res.body).toHaveProperty('intuitionXp', 0);
      expect(res.body).toHaveProperty('rating', 1000);
      expect(res.body).toHaveProperty('totalXp', 0);
      expect(res.body).toHaveProperty('level', 0);
      expect(res.body).toHaveProperty('xpProgress');
      expect(res.body).toHaveProperty('branchLevels');
      expect(res.body).toHaveProperty('branchProgress');
    });

    it('GET /stats/me — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/stats/me')
        .expect(401);
    });
  });

  // ═════���════════════════════════════════════════
  // 2. ADD XP VIA SERVICE (simulates battle XP)
  // ══════════════════════════════════════════════

  describe('Add XP via service', () => {
    it('addXp(strategyXp, 500) — should increment and return enriched stats', async () => {
      const result = await statsService.addXp(userId, 'strategyXp', 500);

      expect(result.strategyXp).toBe(500);
      expect(result.totalXp).toBe(500);
      // level = floor(sqrt(500/100)) = floor(sqrt(5)) = floor(2.236) = 2
      expect(result.level).toBe(2);
      expect(result.xpProgress).toBeDefined();
      expect(result.branchLevels).toBeDefined();
    });

    it('addXp(logicXp, 300) — should add to logic', async () => {
      const result = await statsService.addXp(userId, 'logicXp', 300);

      expect(result.logicXp).toBe(300);
      expect(result.strategyXp).toBe(500);
      expect(result.totalXp).toBe(800);
    });

    it('addXp(eruditionXp, 200) — should add to erudition', async () => {
      const result = await statsService.addXp(userId, 'eruditionXp', 200);

      expect(result.eruditionXp).toBe(200);
      expect(result.totalXp).toBe(1000);
      // level = floor(sqrt(1000/100)) = floor(sqrt(10)) = floor(3.16) = 3
      expect(result.level).toBe(3);
    });

    it('addXp(rhetoricXp, 100) — should add to rhetoric', async () => {
      const result = await statsService.addXp(userId, 'rhetoricXp', 100);
      expect(result.rhetoricXp).toBe(100);
    });

    it('addXp(intuitionXp, 100) — should add to intuition', async () => {
      const result = await statsService.addXp(userId, 'intuitionXp', 100);
      expect(result.intuitionXp).toBe(100);
      expect(result.totalXp).toBe(1200);
    });
  });

  // ════════════════���═════════════════════════════
  // 3. STATS AFTER XP — verify computed fields
  // ══════════════════════��═══════════════════════

  describe('Stats after XP changes', () => {
    it('GET /stats/me — should reflect accumulated XP', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.strategyXp).toBe(500);
      expect(res.body.logicXp).toBe(300);
      expect(res.body.eruditionXp).toBe(200);
      expect(res.body.rhetoricXp).toBe(100);
      expect(res.body.intuitionXp).toBe(100);
      expect(res.body.totalXp).toBe(1200);
      // level = floor(sqrt(1200/100)) = floor(3.46) = 3
      expect(res.body.level).toBe(3);
    });

    it('branchLevels should have correct per-branch levels', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.branchLevels).toHaveProperty('logic');
      expect(res.body.branchLevels).toHaveProperty('erudition');
      expect(res.body.branchLevels).toHaveProperty('strategy');
      expect(res.body.branchLevels).toHaveProperty('rhetoric');
      expect(res.body.branchLevels).toHaveProperty('intuition');
      expect(res.body.branchLevels).toHaveProperty('overall');

      // strategy 500 XP → level = floor(sqrt(500/100)) = 2
      expect(res.body.branchLevels.strategy).toBe(2);
      // logic 300 XP → level = floor(sqrt(300/100)) = floor(1.73) = 1
      expect(res.body.branchLevels.logic).toBe(1);
    });

    it('branchProgress should show current/required for each branch', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      for (const branch of ['logic', 'erudition', 'strategy', 'rhetoric', 'intuition']) {
        expect(res.body.branchProgress[branch]).toHaveProperty('current');
        expect(res.body.branchProgress[branch]).toHaveProperty('required');
        expect(res.body.branchProgress[branch]).toHaveProperty('level');
      }
    });
  });

  // ═══════════════���═════════════════════════���════
  // 4. PROFILE SUMMARY
  // ═════════���═════════════��══════════════════════

  describe('Profile Summary', () => {
    it('GET /stats/me/summary — should return full profile summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id', userId);
      expect(res.body.user).toHaveProperty('name', 'E2E Stats User');
      expect(res.body).toHaveProperty('level');
      expect(res.body).toHaveProperty('totalXp');
      expect(res.body).toHaveProperty('xpProgress');
      expect(res.body).toHaveProperty('branchLevels');
      expect(res.body).toHaveProperty('branchProgress');
      expect(res.body).toHaveProperty('rating');
      expect(res.body).toHaveProperty('branchRatings');
      expect(res.body).toHaveProperty('streakDays');
      expect(res.body).toHaveProperty('thinkerClass');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('battles');

      // ThinkerClass should be determined by dominant branch (strategy=500 is highest)
      expect(res.body.thinkerClass).toBeDefined();
    });

    it('GET /stats/me/summary — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/stats/me/summary')
        .expect(401);
    });
  });

  // ══════════════════════════════════════���═══════
  // 5. THINKER CLASS DETERMINATION
  // ══════���═══════════════════════════════��═══════

  describe('Thinker class', () => {
    it('Service: determineThinkerClass updated after addXp', async () => {
      // Strategy is dominant (500 vs others), should be STRATEGIST
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      expect(stats).toBeDefined();
      // thinkerClass is updated by addXp
      expect(stats!.thinkerClass).toBeDefined();
    });

    it('Massive XP to logic should change thinkerClass', async () => {
      // Add 2000 logic XP to make it dominant
      await statsService.addXp(userId, 'logicXp', 2000);
      const stats = await prisma.userStats.findUnique({ where: { userId } });
      // logic is now 2300, strategy 500 — logic dominant → PHILOSOPHER
      expect(stats!.thinkerClass).toBe('PHILOSOPHER');
    });
  });

  // ══════════════════════���═════════════════════���═
  // 6. BATTLE STATS
  // ═══════════════════════════��══════════════════

  describe('Battle stats', () => {
    it('GET /stats/me/battles — should return battle statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me/battles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('wins');
      expect(res.body).toHaveProperty('losses');
      expect(res.body).toHaveProperty('winRate');
      expect(typeof res.body.total).toBe('number');
      expect(typeof res.body.winRate).toBe('number');
    });
  });

  // ════════════��═════════════════════════════════
  // 7. WEAKNESSES
  // ═══════���══════════════���═══════════════════════

  describe('Weaknesses', () => {
    it('GET /stats/me/weaknesses — should return weakness analysis', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me/weaknesses')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('branches');
      expect(res.body).toHaveProperty('categories');
      expect(res.body).toHaveProperty('xpByBranch');
      expect(res.body).toHaveProperty('weakestBranch');
      expect(Array.isArray(res.body.branches)).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
    });
  });

  // ═════════��════════════════════════════════════
  // 8. RECOMMENDATIONS
  // ═════════════════════════���════════════════════

  describe('Recommendations', () => {
    it('GET /stats/me/recommendations �� should return module recommendations', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/me/recommendations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('targetBranches');
      expect(res.body).toHaveProperty('modules');
      expect(res.body).toHaveProperty('practiceCategories');
      expect(Array.isArray(res.body.targetBranches)).toBe(true);
      expect(Array.isArray(res.body.modules)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════
  // 9. LEADERBOARD (BT.6)
  // ═════════════════════════════════════════��════

  describe('Leaderboard', () => {
    it('GET /stats/leaderboard — should return top players by rating', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'rating');
      expect(res.body).toHaveProperty('period', 'all');
      expect(res.body).toHaveProperty('entries');
      expect(Array.isArray(res.body.entries)).toBe(true);

      if (res.body.entries.length > 0) {
        const entry = res.body.entries[0];
        expect(entry).toHaveProperty('rank');
        expect(entry).toHaveProperty('user');
        expect(entry).toHaveProperty('rating');
        expect(entry).toHaveProperty('totalXp');
        expect(entry).toHaveProperty('level');
        expect(entry).toHaveProperty('branchLevels');
        expect(entry).toHaveProperty('thinkerClass');
      }
    });

    it('GET /stats/leaderboard?type=xp — should return top by XP', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard?type=xp')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'xp');
      expect(res.body).toHaveProperty('entries');
      expect(Array.isArray(res.body.entries)).toBe(true);
    });

    it('GET /stats/leaderboard?type=streak — should return top by streak', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard?type=streak')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('type', 'streak');
      expect(res.body).toHaveProperty('entries');
    });

    it('GET /stats/leaderboard?limit=5 — should limit results', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard?limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.entries.length).toBeLessThanOrEqual(5);
    });

    it('GET /stats/leaderboard — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/stats/leaderboard')
        .expect(401);
    });
  });

  // ════════════��═════════════════════════════════
  // 10. MY POSITION IN LEADERBOARD
  // ═══════��═════════════════════════════════════���

  describe('My leaderboard position', () => {
    it('GET /stats/leaderboard/me �� should return my position by rating', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('type', 'rating');
      expect(res.body).toHaveProperty('rating');
      expect(res.body).toHaveProperty('totalXp');
      expect(typeof res.body.rank).toBe('number');
      expect(res.body.rank).toBeGreaterThanOrEqual(1);
    });

    it('GET /stats/leaderboard/me?type=xp �� should return my XP position', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard/me?type=xp')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('type', 'xp');
      expect(typeof res.body.rank).toBe('number');
    });

    it('GET /stats/leaderboard/me?type=streak — should return my streak position', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/leaderboard/me?type=streak')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('type', 'streak');
    });

    it('GET /stats/leaderboard/me — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/stats/leaderboard/me')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 11. SEASON ENDPOINTS
  // ═��═════════════════════��══════════════════════

  describe('Season endpoints', () => {
    it('GET /stats/season/current — should return current season or empty', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/season/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // May be null/empty if no active season exists, or a season object with id/name
      if (res.body && res.body.id) {
        expect(res.body).toHaveProperty('name');
      }
    });

    it('GET /stats/season/history — should return array', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/season/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /stats/season/me — should return user season rewards', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/season/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════
  // 12. SERVICE-LEVEL: addBattleXp
  // ════════���══════════════════��══════════════════

  describe('Service: addBattleXp', () => {
    it('should award XP for battle result (won)', async () => {
      const before = await prisma.userStats.findUnique({ where: { userId } });
      const prevStrategy = before!.strategyXp;

      const result = await statsService.addBattleXp(userId, {
        correct: 3,
        total: 5,
        won: true,
        branch: 'STRATEGY',
      });

      // 3 correct * 10 = 30 primary + 25 win bonus = 55 to strategy
      // 3 correct * 5 = 15 to erudition (secondary)
      expect(result.strategyXp).toBe(prevStrategy + 55);
      expect(result.totalXp).toBeGreaterThan(0);
      expect(result.level).toBeGreaterThanOrEqual(0);
    });

    it('should award XP for battle result (lost)', async () => {
      const before = await prisma.userStats.findUnique({ where: { userId } });
      const prevLogic = before!.logicXp;

      const result = await statsService.addBattleXp(userId, {
        correct: 2,
        total: 5,
        won: false,
        branch: 'LOGIC',
      });

      // 2 correct * 10 = 20 primary (no win bonus) to logic
      // 2 correct * 5 = 10 to erudition
      expect(result.logicXp).toBe(prevLogic + 20);
    });
  });

  // ═��═══════════════════��═══════════════════════���
  // 13. SERVICE-LEVEL: calculateLevel formula
  // ══════════════════════════════════════════════

  describe('Service: level calculation', () => {
    it('level 0 at 0 XP', () => {
      expect(statsService.calculateLevel(0)).toBe(0);
    });

    it('level 1 at 100 XP', () => {
      expect(statsService.calculateLevel(100)).toBe(1);
    });

    it('level 1 at 399 XP', () => {
      expect(statsService.calculateLevel(399)).toBe(1);
    });

    it('level 2 at 400 XP', () => {
      expect(statsService.calculateLevel(400)).toBe(2);
    });

    it('level 10 at 10000 XP', () => {
      expect(statsService.calculateLevel(10000)).toBe(10);
    });

    it('xpToNextLevel at 0 XP', () => {
      const progress = statsService.calculateXpToNextLevel(0);
      expect(progress.current).toBe(0);
      expect(progress.required).toBe(100);
    });

    it('xpToNextLevel at 150 XP (level 1, 50/300 to level 2)', () => {
      const progress = statsService.calculateXpToNextLevel(150);
      // level 1: xpForCurrentLevel = 100, xpForNext = 400
      expect(progress.current).toBe(50);
      expect(progress.required).toBe(300);
    });
  });

  // ══════════════════════════════════════════════
  // 14. SERVICE-LEVEL: leaderboard
  // ══════���═══════════════════════════════════════

  describe('Service: leaderboard', () => {
    it('getLeaderboard(rating) — should return entries', async () => {
      const result = await leaderboardService.getLeaderboard('rating', 'all', 10);
      expect(result).toHaveProperty('type', 'rating');
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('getLeaderboard(xp) — should return entries sorted by totalXp', async () => {
      const result = await leaderboardService.getLeaderboard('xp', 'all', 10);
      expect(result).toHaveProperty('type', 'xp');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('getMyPosition — should return rank', async () => {
      const result = await leaderboardService.getMyPosition(userId, 'rating', 'all');
      expect(result).toHaveProperty('rank');
      expect(result).toHaveProperty('total');
      expect(typeof result.rank).toBe('number');
      expect(result.rank).toBeGreaterThanOrEqual(1);
    });
  });
});
