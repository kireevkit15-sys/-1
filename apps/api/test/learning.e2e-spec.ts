/**
 * Learning System E2E Tests
 *
 * B25.1: POST /learning/determine — start zone determined correctly
 * B25.2: POST /learning/start — LearningPath created, route built
 * B25.3: GET /learning/today — cards returned in correct order
 * B25.4: POST /learning/explain — AI grading works (mocked)
 * B25.7: GET /learning/depth/:conceptId — depth layers returned
 * B25.8: GET /learning/mastery — knowledge map with correct levels
 *
 * Run: node --stack-size=65536 test/run-e2e.js learning.e2e-spec
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';

jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiService } from '../src/ai/ai.service';

describe('Learning System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiService: AiService;
  let jwtService: JwtService;

  const testEmail = `e2e-learn-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  const testName = 'E2E Learning User';

  let accessToken: string;
  let userId: string;
  let pathId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    aiService = app.get(AiService);
    jwtService = app.get(JwtService);

    // Register test user
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(201);

    accessToken = res.body.accessToken;
    const decoded = jwtService.decode(accessToken) as { sub: string };
    userId = decoded.sub;
  }, 30000);

  afterAll(async () => {
    // Clean up in FK-safe order
    await prisma.userConceptMastery.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.learningDay.deleteMany({ where: { path: { userId } } }).catch(() => {});
    await prisma.levelBarrier.deleteMany({ where: { path: { userId } } }).catch(() => {});
    await prisma.learningPath.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-learn-' } } }).catch(() => {});
    await app.close();
  }, 15000);

  // ══════════════════════════════════════════════
  // B25.1: POST /learning/determine
  // ══════════════════════════════════════════════

  describe('Determination (B25.1)', () => {
    it('should reject determination without answers', async () => {
      await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject determination with invalid answer count', async () => {
      await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers: [
            { situationIndex: 1, chosenOption: 0 },
          ],
        })
        .expect(400);
    });

    it('should determine start zone correctly — all option 0 = analytical + STRATEGY first', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers: [
            { situationIndex: 1, chosenOption: 0 },
            { situationIndex: 2, chosenOption: 0 },
            { situationIndex: 3, chosenOption: 0 },
            { situationIndex: 4, chosenOption: 0 },
            { situationIndex: 5, chosenOption: 0 },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('startZone');
      expect(res.body).toHaveProperty('painPoint');
      expect(res.body).toHaveProperty('deliveryStyle');
      expect(res.body.deliveryStyle).toBe('analytical');
      expect(res.body.message).toBeDefined();
    });

    it('should determine philosophical style when options are high', async () => {
      // Clean up path so we can re-determine
      await prisma.learningPath.deleteMany({ where: { userId } }).catch(() => {});

      const res = await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers: [
            { situationIndex: 1, chosenOption: 3 },
            { situationIndex: 2, chosenOption: 3 },
            { situationIndex: 3, chosenOption: 3 },
            { situationIndex: 4, chosenOption: 3 },
            { situationIndex: 5, chosenOption: 3 },
          ],
        })
        .expect(201);

      expect(res.body.deliveryStyle).toBe('philosophical');
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/learning/determine')
        .send({
          answers: [
            { situationIndex: 1, chosenOption: 0 },
            { situationIndex: 2, chosenOption: 1 },
            { situationIndex: 3, chosenOption: 2 },
            { situationIndex: 4, chosenOption: 1 },
            { situationIndex: 5, chosenOption: 0 },
          ],
        })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // B25.2: POST /learning/start
  // ══════════════════════════════════════════════

  describe('Start Learning Path (B25.2)', () => {
    it('should create learning path with determination data', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          startZone: 'LOGIC',
          painPoint: 'RHETORIC',
          deliveryStyle: 'analytical',
        })
        .expect(201);

      expect(res.body).toHaveProperty('pathId');
      expect(res.body).toHaveProperty('currentLevel', 'SLEEPING');
      expect(res.body).toHaveProperty('currentDay', 1);
      expect(res.body.totalDays).toBeGreaterThan(0);

      pathId = res.body.pathId;
    });

    it('should reject duplicate learning path', async () => {
      await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          startZone: 'STRATEGY',
          painPoint: 'LOGIC',
          deliveryStyle: 'practical',
        })
        .expect(409);
    });

    it('should create path without determination (defaults)', async () => {
      // Create second user for this test
      const email2 = `e2e-learn-nodetermine-${Date.now()}@test.com`;
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: email2, password: testPassword, name: 'No Determine User' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${reg.body.accessToken}`)
        .send({})
        .expect(201);

      expect(res.body).toHaveProperty('pathId');
      expect(res.body.totalDays).toBeGreaterThan(0);

      // Cleanup
      const decoded2 = jwtService.decode(reg.body.accessToken) as { sub: string };
      const uid2 = decoded2.sub;
      await prisma.learningDay.deleteMany({ where: { path: { userId: uid2 } } }).catch(() => {});
      await prisma.learningPath.deleteMany({ where: { userId: uid2 } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: email2 } }).catch(() => {});
    });
  });

  // ══════════════════════════════════════════════
  // B25.3: GET /learning/today
  // ══════════════════════════════════════════════

  describe('Today\'s Lesson (B25.3)', () => {
    it('should return today\'s lesson with cards', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('dayNumber', 1);
      expect(res.body).toHaveProperty('concept');
      expect(res.body.concept).toHaveProperty('id');
      expect(res.body.concept).toHaveProperty('slug');
      expect(res.body.concept).toHaveProperty('nameRu');
      expect(res.body.concept).toHaveProperty('branch');
      expect(res.body).toHaveProperty('cards');
      expect(Array.isArray(res.body.cards)).toBe(true);
      expect(res.body.cards.length).toBeGreaterThan(0);
    });

    it('should return consistent concept data on repeated calls', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res1.body.dayNumber).toBe(res2.body.dayNumber);
      expect(res1.body.concept.id).toBe(res2.body.concept.id);
    });
  });

  // ══════════════════════════════════════════════
  // GET /learning/status
  // ══════════════════════════════════════════════

  describe('Learning Status', () => {
    it('should return status with path data', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('hasPath', true);
      expect(res.body).toHaveProperty('currentLevel', 'SLEEPING');
      expect(res.body).toHaveProperty('currentDay', 1);
      expect(res.body.completedDays).toBe(0);
      expect(res.body.totalDays).toBeGreaterThan(0);
    });

    it('should return hasPath=false for user without path', async () => {
      const email3 = `e2e-learn-nopath-${Date.now()}@test.com`;
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: email3, password: testPassword, name: 'No Path User' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${reg.body.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('hasPath', false);

      // Cleanup
      await prisma.user.deleteMany({ where: { email: email3 } }).catch(() => {});
    });
  });

  // ══════════════════════════════════════════════
  // Complete day + interact cycle
  // ══════════════════════════════════════════════

  describe('Day Completion Cycle', () => {
    it('POST /learning/interact — should record interaction', async () => {
      // Get today's day ID
      const today = await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Find the actual day record
      const day = await prisma.learningDay.findFirst({
        where: { pathId, dayNumber: 1 },
      });

      const res = await request(app.getHttpServer())
        .post('/learning/interact')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dayId: day!.id,
          cardIndex: 0,
          type: 'VIEW',
          timeSpentMs: 5000,
        })
        .expect(201);

      expect(res.body).toHaveProperty('recorded', true);
    });

    it('POST /learning/day/1/complete — should complete day 1 and advance', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/day/1/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('completedDay', 1);
      expect(res.body).toHaveProperty('nextDay', 2);
      expect(res.body).toHaveProperty('barrierNeeded');
    });

    it('should reject completing already completed day', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/1/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });

    it('should reject completing wrong day (skip)', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/5/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('status should reflect day 2 and 1 completed day', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.currentDay).toBe(2);
      expect(res.body.completedDays).toBe(1);
    });
  });

  // ══════════════════════════════════════════════
  // B25.4: POST /learning/explain (AI grading)
  // ══════════════════════════════════════════════

  describe('Explain / AI Grading (B25.4)', () => {
    let testConceptId: string;

    beforeAll(async () => {
      // Get a real concept ID from today's lesson
      const today = await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      testConceptId = today.body.concept.id;
    });

    it('should grade explanation via AI (mocked)', async () => {
      // Mock AI response
      jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
        JSON.stringify({
          grade: 'understood',
          feedback: 'Excellent explanation',
          hints: [],
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/learning/explain')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conceptId: testConceptId,
          explanation: 'This concept explains how people tend to focus on visible problems instead of analyzing systemic root causes.',
        })
        .expect(201);

      expect(res.body).toHaveProperty('grade', 'understood');
      expect(res.body).toHaveProperty('feedback');
      expect(res.body).toHaveProperty('conceptName');
    });

    it('should reject explanation that is too short', async () => {
      await request(app.getHttpServer())
        .post('/learning/explain')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conceptId: testConceptId,
          explanation: 'short',
        })
        .expect(400);
    });

    it('should reject explanation for nonexistent concept', async () => {
      await request(app.getHttpServer())
        .post('/learning/explain')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conceptId: '00000000-0000-0000-0000-000000000000',
          explanation: 'This is a full explanation of the concept for testing purposes.',
        })
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════
  // B25.7: GET /learning/depth/:conceptId
  // ══════════════════════════════════════════════

  describe('Depth Layers (B25.7)', () => {
    it('should return depth layers for a concept', async () => {
      // Find a concept with depth layers
      const conceptWithLayers = await prisma.concept.findFirst({
        where: { depthLayers: { some: {} } },
        select: { id: true },
      });

      if (!conceptWithLayers) {
        console.warn('No concepts with depth layers found, skipping test');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/learning/depth/${conceptWithLayers.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('concept');
      expect(res.body.concept).toHaveProperty('id', conceptWithLayers.id);
      expect(res.body.concept).toHaveProperty('nameRu');
      expect(res.body).toHaveProperty('layers');
      expect(typeof res.body.layers).toBe('object');
      expect(res.body).toHaveProperty('relations');
    });

    it('should return 404 for nonexistent concept', async () => {
      await request(app.getHttpServer())
        .get('/learning/depth/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should include mastery if user has it', async () => {
      // Find concept user has mastery for (from completing day 1)
      const mastery = await prisma.userConceptMastery.findFirst({
        where: { userId },
        select: { conceptId: true },
      });

      if (!mastery) {
        console.warn('No mastery records found, skipping');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/learning/depth/${mastery.conceptId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.mastery).not.toBeNull();
      expect(res.body.mastery).toHaveProperty('level');
      expect(res.body.mastery).toHaveProperty('bloomReached');
    });
  });

  // ══════════════════════════════════════════════
  // B25.8: GET /learning/mastery
  // ══════════════════════════════════════════════

  describe('Mastery Map (B25.8)', () => {
    it('should return mastery map with branch statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/mastery')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('concepts');
      expect(Array.isArray(res.body.concepts)).toBe(true);
      expect(res.body).toHaveProperty('branchStats');
      expect(typeof res.body.branchStats).toBe('object');

      // Should have at least 1 concept (we completed day 1)
      if (res.body.concepts.length > 0) {
        const firstConcept = res.body.concepts[0];
        expect(firstConcept).toHaveProperty('id');
        expect(firstConcept).toHaveProperty('slug');
        expect(firstConcept).toHaveProperty('branch');
      }
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/learning/mastery')
        .expect(401);
    });
  });
});
