/**
 * Achievements E2E Test — List, user progress, unlock, count.
 *
 * BT.9
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/achievements.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AchievementsService } from '../src/achievements/achievements.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('Achievements E2E (BT.9)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let achievementsService: AchievementsService;

  let userToken: string;
  let userId: string;

  // Test achievement IDs
  let testAchievementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    achievementsService = app.get(AchievementsService);

    // Register user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-ach-${Date.now()}@test.com`,
        password: 'Ach123!!',
        name: 'E2E Achievement User',
      })
      .expect(201);

    userToken = userRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(userToken.split('.')[1], 'base64').toString(),
    );
    userId = payload.sub;

    // Create a test achievement for controlled unlock testing
    const ach = await prisma.achievement.create({
      data: {
        code: `e2e_test_ach_${Date.now()}`,
        name: 'E2E Test Achievement',
        description: 'Win 1 battle',
        icon: '🏆',
        category: 'BATTLE',
        condition: { type: 'wins', threshold: 1 },
        xpReward: 50,
        isActive: true,
      },
    });
    testAchievementId = ach.id;
  });

  afterAll(async () => {
    await prisma.userAchievement
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.achievement
      .deleteMany({ where: { code: { startsWith: 'e2e_test_ach_' } } })
      .catch(() => {});
    await prisma.userStats
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-ach-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. LIST ALL ACHIEVEMENTS (public)
  // ══════════════════════════════════════════════

  describe('List achievements', () => {
    it('GET /achievements — should return all active achievements', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      // Find our test achievement
      const testAch = res.body.find((a: any) => a.id === testAchievementId);
      expect(testAch).toBeDefined();
      expect(testAch.name).toBe('E2E Test Achievement');
      expect(testAch.category).toBe('BATTLE');
      expect(testAch.isActive).toBe(true);
    });

    it('GET /achievements?category=BATTLE — should filter by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements?category=BATTLE')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const ach of res.body) {
        expect(ach.category).toBe('BATTLE');
      }
    });

    it('GET /achievements?category=STREAK — should filter STREAK', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements?category=STREAK')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const ach of res.body) {
        expect(ach.category).toBe('STREAK');
      }
    });
  });

  // ══════════════════════════════════════════════
  // 2. MY ACHIEVEMENTS (before unlock)
  // ══════════════════════════════════════════════

  describe('My achievements (before unlock)', () => {
    it('GET /achievements/me — should return achievements with zero progress', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const testAch = res.body.find((a: any) => a.id === testAchievementId);
      expect(testAch).toBeDefined();
      expect(testAch.progress).toBe(0);
      expect(testAch.unlocked).toBe(false);
      expect(testAch.unlockedAt).toBeNull();
      expect(testAch).toHaveProperty('threshold');
      expect(testAch).toHaveProperty('xpReward');
    });

    it('GET /achievements/me — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/achievements/me')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 3. UNLOCKED COUNT (before unlock)
  // ══════════════════════════════════════════════

  describe('Unlocked count (before)', () => {
    it('GET /achievements/me/count — should return counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements/me/count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('unlocked');
      expect(res.body).toHaveProperty('total');
      expect(typeof res.body.unlocked).toBe('number');
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /achievements/me/count — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/achievements/me/count')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 4. UNLOCK VIA SERVICE (checkAndUpdate)
  // ══════════════════════════════════════════════

  describe('Unlock achievement via service', () => {
    it('checkAndUpdate(wins, 1) — should unlock the test achievement', async () => {
      const result = await achievementsService.checkAndUpdate(userId, 'wins', 1);

      expect(result).toHaveProperty('newlyUnlocked');
      expect(Array.isArray(result.newlyUnlocked)).toBe(true);
      // Our test achievement has threshold 1 for wins
      expect(result.newlyUnlocked.length).toBeGreaterThanOrEqual(1);
    });

    it('checkAndUpdate(wins, 1) again — should NOT re-unlock', async () => {
      const result = await achievementsService.checkAndUpdate(userId, 'wins', 1);

      // Already unlocked, should not appear in newlyUnlocked
      const testCode = (await prisma.achievement.findUnique({ where: { id: testAchievementId } }))!.code;
      expect(result.newlyUnlocked).not.toContain(testCode);
    });
  });

  // ══════════════════════════════════════════════
  // 5. MY ACHIEVEMENTS (after unlock)
  // ══════════════════════════════════════════════

  describe('My achievements (after unlock)', () => {
    it('GET /achievements/me — test achievement should be unlocked', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const testAch = res.body.find((a: any) => a.id === testAchievementId);
      expect(testAch).toBeDefined();
      expect(testAch.unlocked).toBe(true);
      expect(testAch.unlockedAt).not.toBeNull();
      expect(testAch.progress).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════
  // 6. UNLOCKED COUNT (after unlock)
  // ══════════════════════════════════════════════

  describe('Unlocked count (after)', () => {
    it('GET /achievements/me/count — unlocked should be >= 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/achievements/me/count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.unlocked).toBeGreaterThanOrEqual(1);
      expect(res.body.total).toBeGreaterThanOrEqual(res.body.unlocked);
    });
  });

  // ══════════════════════════════════════════════
  // 7. SERVICE: progress update without unlock
  // ══════════════════════════════════════════════

  describe('Service: progress without unlock', () => {
    let highThresholdAchId: string;

    beforeAll(async () => {
      const ach = await prisma.achievement.create({
        data: {
          code: `e2e_test_ach_high_${Date.now()}`,
          name: 'E2E High Threshold',
          description: 'Win 100 battles',
          icon: '🎯',
          category: 'BATTLE',
          condition: { type: 'wins', threshold: 100 },
          xpReward: 200,
          isActive: true,
        },
      });
      highThresholdAchId = ach.id;
    });

    it('checkAndUpdate(wins, 5) — should update progress but not unlock', async () => {
      await achievementsService.checkAndUpdate(userId, 'wins', 5);

      const userAch = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId, achievementId: highThresholdAchId },
        },
      });

      expect(userAch).toBeDefined();
      expect(userAch!.progress).toBe(5);
      expect(userAch!.unlockedAt).toBeNull();
    });

    afterAll(async () => {
      await prisma.userAchievement
        .deleteMany({ where: { achievementId: highThresholdAchId } })
        .catch(() => {});
      await prisma.achievement
        .delete({ where: { id: highThresholdAchId } })
        .catch(() => {});
    });
  });

  // ══════════════════════════════════════════════
  // 8. SERVICE: getUnlockedCount
  // ══════════════════════════════════════════════

  describe('Service: getUnlockedCount', () => {
    it('should return correct counts', async () => {
      const result = await achievementsService.getUnlockedCount(userId);
      expect(result).toHaveProperty('unlocked');
      expect(result).toHaveProperty('total');
      expect(result.unlocked).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(result.unlocked);
    });
  });
});
