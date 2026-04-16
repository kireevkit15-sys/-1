/**
 * Learn E2E Test — Modules 5 branches, progress, unlock, completion.
 *
 * BT.4
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/learn.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { LearnService } from '../src/learn/learn.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('Learn E2E (BT.4)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let learnService: LearnService;

  let userToken: string;
  let userId: string;

  // Test data IDs
  const questionIds: string[] = [];
  let module1Id: string;
  let module2Id: string;

  const TEST_BRANCH = 'INTUITION';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    learnService = app.get(LearnService);

    // Register user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-learn-${Date.now()}@test.com`,
        password: 'Learn123!',
        name: 'E2E Learn User',
      })
      .expect(201);

    userToken = userRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(userToken.split('.')[1]!, 'base64').toString(),
    );
    userId = payload.sub;

    // Clean up any existing modules at orderIndex 1-2 in test branch to avoid conflicts
    await prisma.userModuleProgress.deleteMany({
      where: { module: { branch: TEST_BRANCH, orderIndex: { in: [1, 2] } } },
    }).catch(() => {});
    await prisma.module.deleteMany({
      where: { branch: TEST_BRANCH, orderIndex: { in: [1, 2] } },
    }).catch(() => {});

    // Create test questions
    for (let i = 0; i < 4; i++) {
      const q = await prisma.question.create({
        data: {
          text: `E2E Learn Q${i + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          category: 'e2e-learn-test',
          branch: TEST_BRANCH,
          difficulty: 'BRONZE',
          statPrimary: 'intuition',
          explanation: '',
        },
      });
      questionIds.push(q.id);
    }

    // Create test modules — module 1 (orderIndex 1) and module 2 (orderIndex 2)
    // orderIndex 1 is auto-unlocked by isModuleUnlocked logic
    const mod1 = await prisma.module.create({
      data: {
        branch: TEST_BRANCH,
        orderIndex: 1,
        title: 'E2E Test Module 1',
        description: 'First test module',
        questionIds: [questionIds[0]!, questionIds[1]!],
      },
    });
    module1Id = mod1.id;

    const mod2 = await prisma.module.create({
      data: {
        branch: TEST_BRANCH,
        orderIndex: 2,
        title: 'E2E Test Module 2',
        description: 'Second test module (locked until module 1 complete)',
        questionIds: [questionIds[2]!, questionIds[3]!],
      },
    });
    module2Id = mod2.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.userModuleProgress
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.module
      .deleteMany({ where: { title: { startsWith: 'E2E Test Module' } } })
      .catch(() => {});
    await prisma.question
      .deleteMany({ where: { category: 'e2e-learn-test' } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-learn-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. LIST MODULES BY BRANCH
  // ══════════════════════════════════════════════

  describe('List modules by branch', () => {
    it('GET /modules?branch=STRATEGY — should return modules with progress', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules?branch=${TEST_BRANCH}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Find our test modules
      const testMods = res.body.filter((m: any) =>
        m.title.startsWith('E2E Test Module'),
      );
      expect(testMods.length).toBe(2);

      // Each module should have progress fields
      for (const mod of testMods) {
        expect(mod).toHaveProperty('id');
        expect(mod).toHaveProperty('branch', TEST_BRANCH);
        expect(mod).toHaveProperty('totalQuestions');
        expect(mod).toHaveProperty('completedQuestions');
        expect(mod).toHaveProperty('isCompleted');
        expect(mod).toHaveProperty('isUnlocked');
      }
    });

    it('GET /modules?branch=LOGIC — should return LOGIC modules', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules?branch=LOGIC')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const mod of res.body) {
        expect(mod.branch).toBe('LOGIC');
      }
    });

    it('GET /modules — without branch param returns modules (DTO type-only import)', async () => {
      const res = await request(app.getHttpServer())
        .get('/modules')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /modules — should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .get(`/modules?branch=${TEST_BRANCH}`)
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 2. MODULE DETAIL
  // ══════════════════════════════════════════════

  describe('Module detail', () => {
    it('GET /modules/:id — should return module with questions (module 1 unlocked)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules/${module1Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(module1Id);
      expect(res.body.title).toBe('E2E Test Module 1');
      expect(res.body).toHaveProperty('questions');
      expect(res.body.questions.length).toBe(2);

      for (const q of res.body.questions) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('text');
        expect(q).toHaveProperty('options');
        expect(q).toHaveProperty('isCompleted');
      }
    });

    it('GET /modules/:id — should 404 for non-existent module', async () => {
      await request(app.getHttpServer())
        .get('/modules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════
  // 3. MODULE UNLOCK LOGIC
  // ══════════════════════════════════════════════

  describe('Module unlock logic', () => {
    it('Module 2 should be locked (module 1 not completed)', async () => {
      await request(app.getHttpServer())
        .get(`/modules/${module2Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════
  // 4. SUBMIT PROGRESS
  // ══════════════════════════════════════════════

  describe('Submit progress', () => {
    it('POST /modules/:id/progress — should mark first question completed', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/${module1Id}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: questionIds[0] })
        .expect(201);

      expect(res.body.alreadyCompleted).toBe(false);
      expect(res.body.completedQuestions).toBe(1);
      expect(res.body.totalQuestions).toBe(2);
      expect(res.body.moduleCompleted).toBe(false);
    });

    it('POST /modules/:id/progress — duplicate should return alreadyCompleted', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/${module1Id}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: questionIds[0] })
        .expect(201);

      expect(res.body.alreadyCompleted).toBe(true);
    });

    it('POST /modules/:id/progress — should mark second question and complete module', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/${module1Id}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: questionIds[1] })
        .expect(201);

      expect(res.body.alreadyCompleted).toBe(false);
      expect(res.body.completedQuestions).toBe(2);
      expect(res.body.totalQuestions).toBe(2);
      expect(res.body.moduleCompleted).toBe(true);
    });

    it('POST /modules/:id/progress — should reject question not in module', async () => {
      await request(app.getHttpServer())
        .post(`/modules/${module1Id}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: questionIds[2] }) // belongs to module 2
        .expect(400);
    });

    it('POST /modules/:id/progress — should reject without auth', async () => {
      await request(app.getHttpServer())
        .post(`/modules/${module1Id}/progress`)
        .send({ questionId: questionIds[0] })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 5. MODULE 2 UNLOCK AFTER COMPLETION
  // ══════════════════════════════════════════════

  describe('Module 2 unlocks after module 1 completion', () => {
    it('Module 2 should now be accessible', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules/${module2Id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(module2Id);
      expect(res.body.title).toBe('E2E Test Module 2');
      expect(res.body.questions.length).toBe(2);
    });

    it('Progress in module 2 should work', async () => {
      const res = await request(app.getHttpServer())
        .post(`/modules/${module2Id}/progress`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: questionIds[2] })
        .expect(201);

      expect(res.body.alreadyCompleted).toBe(false);
      expect(res.body.completedQuestions).toBe(1);
    });
  });

  // ══════════════════════════════════════════════
  // 6. COMPLETED MODULE STATUS
  // ══════════════════════════════════════════════

  describe('Completed module status in list', () => {
    it('GET /modules should show module 1 as completed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/modules?branch=${TEST_BRANCH}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const mod1 = res.body.find((m: any) => m.id === module1Id);
      expect(mod1).toBeDefined();
      expect(mod1.isCompleted).toBe(true);
      expect(mod1.completedQuestions).toBe(2);
      expect(mod1.totalQuestions).toBe(2);
    });
  });

  // ══════════════════════════════════════════════
  // 7. SERVICE-LEVEL: all 5 branches
  // ══════════════════════════════════════════════

  describe('Service-level: modules for all 5 branches', () => {
    const allBranches = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] as const;

    for (const branch of allBranches) {
      it(`getModules(${branch}) — should return array`, async () => {
        const result = await learnService.getModules(userId, branch);
        expect(Array.isArray(result)).toBe(true);
        for (const mod of result) {
          expect(mod.branch).toBe(branch);
        }
      });
    }
  });
});
