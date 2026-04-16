/**
 * Questions E2E Test — CRUD, filters by 5 branches, bulk, report, auto-deactivate.
 *
 * BT.3
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/questions.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QuestionService } from '../src/question/question.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('Questions E2E (BT.3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let createdQuestionId: string;

  const branches = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] as const;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Register admin user
    const adminEmail = `e2e-questions-admin-${Date.now()}@test.com`;
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password: 'Admin123!', name: 'E2E Admin' })
      .expect(201);

    const adminPayload = JSON.parse(
      Buffer.from(adminRes.body.accessToken.split('.')[1], 'base64').toString(),
    );
    adminId = adminPayload.sub;

    // Promote to admin
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    // Re-login to get token with ADMIN role
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'Admin123!' })
      .expect(201);
    adminToken = adminLogin.body.accessToken;

    // Register regular user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-questions-user-${Date.now()}@test.com`,
        password: 'User123!',
        name: 'E2E User',
      })
      .expect(201);
    userToken = userRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.questionFeedback
      .deleteMany({ where: { question: { category: { startsWith: 'e2e-test-' } } } })
      .catch(() => {});
    await prisma.question
      .deleteMany({ where: { category: { startsWith: 'e2e-test-' } } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-questions-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. CREATE (Admin)
  // ══════════════════════════════════════════════

  describe('Create Question (Admin)', () => {
    it('POST /questions — should create a question', async () => {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'What is the capital of France?',
          options: ['Berlin', 'Paris', 'Madrid', 'Rome'],
          correctIndex: 1,
          category: 'e2e-test-geography',
          branch: 'ERUDITION',
          difficulty: 'BRONZE',
          statPrimary: 'erudition',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.text).toBe('What is the capital of France?');
      expect(res.body.branch).toBe('ERUDITION');
      expect(res.body.difficulty).toBe('BRONZE');
      createdQuestionId = res.body.id;
    });

    it('POST /questions — should reject for regular user (403)', async () => {
      await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'Unauthorized question',
          options: ['A', 'B'],
          correctIndex: 0,
          category: 'e2e-test-unauth',
          branch: 'LOGIC',
          difficulty: 'BRONZE',
          statPrimary: 'logic',
        })
        .expect(403);
    });

    it('POST /questions — should reject without auth (401)', async () => {
      await request(app.getHttpServer())
        .post('/questions')
        .send({
          text: 'No auth question',
          options: ['A', 'B'],
          correctIndex: 0,
          category: 'e2e-test-noauth',
          branch: 'LOGIC',
          difficulty: 'BRONZE',
          statPrimary: 'logic',
        })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 2. READ
  // ══════════════════════════════════════════════

  describe('Read Questions', () => {
    it('GET /questions/:id — should return question by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdQuestionId);
      expect(res.body.text).toBe('What is the capital of France?');
    });

    it('GET /questions/:id — should 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/questions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('GET /questions/random — should return random questions (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?count=3')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════
  // 3. UPDATE (Admin)
  // ══════════════════════════════════════════════

  describe('Update Question (Admin)', () => {
    it('PATCH /questions/:id — should update question text', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ text: 'What is the capital of France? (updated)' })
        .expect(200);

      expect(res.body.text).toBe('What is the capital of France? (updated)');
    });

    it('PATCH /questions/:id — should update difficulty', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ difficulty: 'SILVER' })
        .expect(200);

      expect(res.body.difficulty).toBe('SILVER');
    });

    it('PATCH /questions/:id — should reject for regular user (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ text: 'Hacked!' })
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════
  // 4. FILTERS BY 5 BRANCHES (via service directly)
  // ══════════════════════════════════════════════

  describe('Filters by 5 branches', () => {
    beforeAll(async () => {
      // Create one question per branch
      for (const branch of branches) {
        await request(app.getHttpServer())
          .post('/questions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            text: `E2E ${branch} question`,
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
            category: `e2e-test-branch-${branch.toLowerCase()}`,
            branch,
            difficulty: 'BRONZE',
            statPrimary: branch.toLowerCase(),
          })
          .expect(201);
      }
    });

    it('GET /questions/random?branch=STRATEGY — should return only STRATEGY questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?branch=STRATEGY&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.branch).toBe('STRATEGY');
      }
    });

    it('GET /questions/random?branch=LOGIC — should return only LOGIC questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?branch=LOGIC&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.branch).toBe('LOGIC');
      }
    });

    it('GET /questions/random?branch=ERUDITION — should return only ERUDITION questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?branch=ERUDITION&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.branch).toBe('ERUDITION');
      }
    });

    it('GET /questions/random?branch=RHETORIC — should return only RHETORIC questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?branch=RHETORIC&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.branch).toBe('RHETORIC');
      }
    });

    it('GET /questions/random?branch=INTUITION — should return only INTUITION questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?branch=INTUITION&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.branch).toBe('INTUITION');
      }
    });

    it('GET /questions/random?difficulty=BRONZE — should filter by difficulty', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/random?difficulty=BRONZE&count=5')
        .expect(200);

      for (const q of res.body) {
        expect(q.difficulty).toBe('BRONZE');
      }
    });

    it('Service-level: findAll with branch filter should return correct results', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.findAll({ branch: 'STRATEGY', limit: 50 });
      expect(result.questions.length).toBeGreaterThan(0);
      for (const q of result.questions) {
        expect(q.branch).toBe('STRATEGY');
      }
    });

    it('Service-level: findAll with difficulty filter should return correct results', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.findAll({ difficulty: 'BRONZE', limit: 50 });
      expect(result.questions.length).toBeGreaterThan(0);
      for (const q of result.questions) {
        expect(q.difficulty).toBe('BRONZE');
      }
    });
  });

  // ══════════════════════════════════════════════
  // 5. BULK CREATE
  // ══════════════════════════════════════════════

  describe('Bulk Create (Admin)', () => {
    it('POST /questions/bulk — should create multiple questions', async () => {
      const res = await request(app.getHttpServer())
        .post('/questions/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questions: [
            {
              text: 'Bulk Q1',
              options: ['A', 'B', 'C'],
              correctIndex: 0,
              category: 'e2e-test-bulk',
              branch: 'LOGIC',
              difficulty: 'BRONZE',
              statPrimary: 'logic',
            },
            {
              text: 'Bulk Q2',
              options: ['X', 'Y', 'Z'],
              correctIndex: 2,
              category: 'e2e-test-bulk',
              branch: 'LOGIC',
              difficulty: 'SILVER',
              statPrimary: 'logic',
            },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(2);
    });

    it('POST /questions/bulk — should reject for regular user (403)', async () => {
      await request(app.getHttpServer())
        .post('/questions/bulk')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          questions: [
            {
              text: 'Unauthorized Bulk',
              options: ['A', 'B'],
              correctIndex: 0,
              category: 'e2e-test-unauth',
              branch: 'LOGIC',
              difficulty: 'BRONZE',
              statPrimary: 'logic',
            },
          ],
        })
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════
  // 6. FEEDBACK / REPORT
  // ══════════════════════════════════════════════

  describe('Feedback & Report', () => {
    let feedbackQuestionId: string;

    beforeAll(async () => {
      // Create a fresh question for feedback tests
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'Feedback test question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 2,
          category: 'e2e-test-feedback',
          branch: 'RHETORIC',
          difficulty: 'SILVER',
          statPrimary: 'rhetoric',
        })
        .expect(201);
      feedbackQuestionId = res.body.id;
    });

    it('submitFeedback (service) — should submit a like', async () => {
      const questionService = app.get(QuestionService);
      const userPayload = JSON.parse(
        Buffer.from(userToken.split('.')[1]!, 'base64').toString(),
      );
      const result = await questionService.submitFeedback(
        feedbackQuestionId, userPayload.sub, 'LIKE',
      );
      expect(result).toHaveProperty('id');
    });

    it('submitFeedback (service) — should submit a report', async () => {
      const questionService = app.get(QuestionService);
      const adminPayload = JSON.parse(
        Buffer.from(adminToken.split('.')[1]!, 'base64').toString(),
      );
      const result = await questionService.submitFeedback(
        feedbackQuestionId, adminPayload.sub, 'REPORT', 'incorrect_answer', 'Wrong answer',
      );
      expect(result).toHaveProperty('id');
    });

    it('getFeedbackStats (service) — should return feedback stats', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.getFeedbackStats(feedbackQuestionId);
      expect(result).toHaveProperty('likes');
      expect(result).toHaveProperty('dislikes');
      expect(result).toHaveProperty('reports');
      expect(result.likes).toBe(1);
      expect(result.reports).toBe(1);
    });
  });

  // ══════════════════════════════════════════════
  // 7. AUTO-DEACTIVATE / ROTATE (service-level)
  // ══════════════════════════════════════════════

  describe('Auto-rotate (service-level)', () => {
    it('autoRotateQuestions should return deactivated count', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.autoRotateQuestions();
      expect(result).toHaveProperty('deactivated');
      expect(typeof result.deactivated).toBe('number');
    });

    it('recalibrateDifficulty should return analyzed count', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.recalibrateDifficulty();
      expect(result).toHaveProperty('analyzed');
      expect(result).toHaveProperty('adjusted');
    });
  });

  // ══════════════════════════════════════════════
  // 8. SOFT DELETE
  // ══════════════════════════════════════════════

  describe('Soft Delete (Admin)', () => {
    let deleteQuestionId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'To be deleted',
          options: ['A', 'B'],
          correctIndex: 0,
          category: 'e2e-test-delete',
          branch: 'INTUITION',
          difficulty: 'GOLD',
          statPrimary: 'intuition',
        })
        .expect(201);
      deleteQuestionId = res.body.id;
    });

    it('DELETE /questions/:id — should soft-delete a question', async () => {
      await request(app.getHttpServer())
        .delete(`/questions/${deleteQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('DELETE /questions/:id — should reject for regular user (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/questions/${createdQuestionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════
  // 9. EXPORT & STATS (service-level)
  // ══════════════════════════════════════════════

  describe('Export & Stats (service-level)', () => {
    it('exportQuestions — should return export object with questions', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.exportQuestions({});
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('exportQuestions with branch filter — should filter by branch', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.exportQuestions({ branch: 'LOGIC' });
      for (const q of result.questions) {
        expect(q.branch).toBe('LOGIC');
      }
    });

    it('getStatsByCategory — should return stats', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.getStatsByCategory();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byBranch');
      expect(result).toHaveProperty('byDifficulty');
    });

    it('getCoverageGaps — should return branch coverage', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.getCoverageGaps();
      expect(result).toHaveProperty('matrix');
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('gapCount');
      expect(result).toHaveProperty('total');
    });
  });

  // ══════════════════════════════════════════════
  // 10. TAGS (service-level)
  // ══════════════════════════════════════════════

  describe('Tags', () => {
    let tagQuestionId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'Tagged question for E2E',
          options: ['A', 'B', 'C'],
          correctIndex: 1,
          category: 'e2e-test-tags',
          branch: 'INTUITION',
          difficulty: 'GOLD',
          statPrimary: 'intuition',
        })
        .expect(201);
      tagQuestionId = res.body.id;
    });

    it('PATCH /questions/:id/tags — should set tags on a question', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/questions/${tagQuestionId}/tags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tags: ['e2e-tag-alpha', 'e2e-tag-beta'] })
        .expect(200);

      expect(res.body.tags).toContain('e2e-tag-alpha');
      expect(res.body.tags).toContain('e2e-tag-beta');
    });

    it('getAllTags (service-level) — should list all tags', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.getAllTags();
      expect(Array.isArray(result)).toBe(true);
    });

    it('findByTags (service-level) — should find questions by tag', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.findByTags(['e2e-tag-alpha']);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════
  // 11. MODERATION QUEUE (service-level)
  // ══════════════════════════════════════════════

  describe('Moderation Queue', () => {
    it('getModerationQueue (service-level) — should return queue', async () => {
      const questionService = app.get(QuestionService);
      const result = await questionService.getModerationQueue();
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });
});
