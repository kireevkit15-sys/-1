/**
 * Learning Barrier E2E Tests
 *
 * B25.5: Full barrier cycle — 4 stages → verdict (pass/fail)
 * B25.6: Retake barrier — review weak concepts → new attempt
 *
 * Run: node --stack-size=65536 test/run-e2e.js learning-barrier.e2e-spec
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

describe('Learning Barrier (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiService: AiService;

  const testEmail = `e2e-barrier-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';

  let accessToken: string;
  let userId: string;
  let barrierId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    aiService = app.get(AiService);

    // Register + create learning path + complete 5 days (barrier minimum is 3)
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Barrier Tester' })
      .expect(201);

    accessToken = reg.body.accessToken;
    const jwtService = app.get(JwtService);
    const decoded = jwtService.decode(accessToken) as { sub: string };
    userId = decoded.sub;

    // Start learning path
    await request(app.getHttpServer())
      .post('/learning/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ startZone: 'STRATEGY' })
      .expect(201);

    // Complete 5 days to unlock barrier
    for (let d = 1; d <= 5; d++) {
      await request(app.getHttpServer())
        .post(`/learning/day/${d}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    }
  }, 30000);

  afterAll(async () => {
    await prisma.userConceptMastery.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.levelBarrier.deleteMany({ where: { path: { userId } } }).catch(() => {});
    await prisma.learningDay.deleteMany({ where: { path: { userId } } }).catch(() => {});
    await prisma.learningPath.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-barrier-' } } }).catch(() => {});
    await app.close();
  }, 15000);

  // ══════════════════════════════════════════════
  // B25.5: Full barrier cycle
  // ══════════════════════════════════════════════

  describe('Full Barrier Cycle (B25.5)', () => {
    it('GET /learning/barrier — should create barrier with 4 stages', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/barrier')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('barrierId');
      expect(res.body).toHaveProperty('level', 'SLEEPING');
      expect(res.body).toHaveProperty('attemptNumber', 1);
      expect(res.body).toHaveProperty('stages');
      expect(res.body.stages).toHaveProperty('recall');
      expect(res.body.stages).toHaveProperty('connect');
      expect(res.body.stages).toHaveProperty('apply');
      expect(res.body.stages).toHaveProperty('defend');
      expect(res.body.resuming).toBe(false);

      barrierId = res.body.barrierId;
    });

    it('GET /learning/barrier — should resume existing barrier', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/barrier')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.barrierId).toBe(barrierId);
      expect(res.body.resuming).toBe(true);
    });

    it('POST /learning/barrier/recall — should grade recall answers', async () => {
      // Get concepts from barrier
      const barrier = await prisma.levelBarrier.findUnique({
        where: { id: barrierId },
      });
      const stages = barrier!.stages as Record<string, { questions: Array<{ conceptId: string }> }>;
      const questions = stages.recall!.questions;

      // Mock AI grading
      for (const _q of questions) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
          JSON.stringify({ score: 0.8, feedback: 'Good recall' }),
        );
      }

      const answers = questions.map((q) => ({
        conceptId: q.conceptId,
        answer: 'This concept is about understanding cognitive biases and thinking patterns.',
      }));

      const res = await request(app.getHttpServer())
        .post('/learning/barrier/recall')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers })
        .expect(201);

      expect(res.body).toHaveProperty('stage', 'recall');
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('avgScore');
      expect(res.body.avgScore).toBeGreaterThanOrEqual(0);
      expect(res.body.avgScore).toBeLessThanOrEqual(1);
    });

    it('POST /learning/barrier/recall — should reject duplicate recall', async () => {
      // Get a real concept ID from the barrier
      const barrier = await prisma.levelBarrier.findUnique({ where: { id: barrierId } });
      const stages = barrier!.stages as Record<string, { questions: Array<{ conceptId: string }> }>;
      const conceptId = stages.recall!.questions[0]!.conceptId;

      jest.spyOn(aiService, 'chatCompletion').mockResolvedValue(
        JSON.stringify({ score: 0.5, feedback: 'ok' }),
      );

      await request(app.getHttpServer())
        .post('/learning/barrier/recall')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers: [{ conceptId, answer: 'duplicate recall test attempt here' }] })
        .expect(409);
    });

    it('POST /learning/barrier/connect — should grade connection pairs', async () => {
      const barrier = await prisma.levelBarrier.findUnique({
        where: { id: barrierId },
      });
      const stages = barrier!.stages as Record<string, { pairs: Array<{ conceptA: string; conceptB: string }> }>;
      const pairs = stages.connect!.pairs;

      for (const _p of pairs) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
          JSON.stringify({ score: 0.7, feedback: 'Decent connection' }),
        );
      }

      const pairsPayload = pairs.map((p) => ({
        conceptA: p.conceptA,
        conceptB: p.conceptB,
        explanation: 'These concepts are related because they both deal with cognitive patterns in decision-making.',
      }));

      const res = await request(app.getHttpServer())
        .post('/learning/barrier/connect')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pairs: pairsPayload })
        .expect(201);

      expect(res.body).toHaveProperty('stage', 'connect');
      expect(res.body).toHaveProperty('avgScore');
    });

    it('POST /learning/barrier/apply — should grade situation answers', async () => {
      jest.spyOn(aiService, 'chatCompletion').mockResolvedValue(
        JSON.stringify({ score: 0.75, feedback: 'Good application', conceptsApplied: ['concept-1'] }),
      );

      const res = await request(app.getHttpServer())
        .post('/learning/barrier/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers: [
            { situationIndex: 0, answer: 'I would apply the concept of systems thinking to analyze root causes rather than symptoms of the conflict.' },
            { situationIndex: 1, answer: 'I would explain that our brains are wired to think linearly, but real-world systems have feedback loops and exponential effects.' },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('stage', 'apply');
      expect(res.body).toHaveProperty('avgScore');
    });

    it('POST /learning/barrier/defend — should run 4 rounds of debate', async () => {
      // Round 1-3
      for (let round = 1; round <= 3; round++) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
          `Interesting point, but you haven't considered the opposite perspective. How do you reconcile this with contradicting evidence? Round ${round}`,
        );

        const res = await request(app.getHttpServer())
          .post('/learning/barrier/defend')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            barrierId,
            message: `My defense for round ${round}: the concept holds because empirical evidence supports it across multiple studies.`,
            round: round - 1,
          })
          .expect(201);

        expect(res.body).toHaveProperty('stage', 'defend');
        expect(res.body).toHaveProperty('round', round);
        expect(res.body).toHaveProperty('aiResponse');

        if (round < 4) {
          expect(res.body.completed).toBe(false);
        }
      }

      // Round 4 (final) — with score in response
      jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
        'You defended your position well. {"score": 0.8, "feedback": "Strong defense with good examples"}',
      );

      const final = await request(app.getHttpServer())
        .post('/learning/barrier/defend')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          barrierId,
          message: 'Final round: I conclude that these concepts form an integrated framework for better decision-making.',
          round: 3,
        })
        .expect(201);

      expect(final.body.completed).toBe(true);
      expect(final.body.results).not.toBeNull();
      expect(final.body.results.score).toBeCloseTo(0.8, 1);
    });

    it('POST /learning/barrier/complete — should pass barrier and advance level', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/barrier/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('passed', true);
      expect(res.body).toHaveProperty('totalScore');
      expect(res.body.totalScore).toBeGreaterThanOrEqual(0.6);
      expect(res.body).toHaveProperty('breakdown');
      expect(res.body.breakdown).toHaveProperty('recall');
      expect(res.body.breakdown).toHaveProperty('connect');
      expect(res.body.breakdown).toHaveProperty('apply');
      expect(res.body.breakdown).toHaveProperty('defend');
      expect(res.body).toHaveProperty('newLevel', 'AWAKENED');
    });

    it('status should show new level after passing barrier', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.currentLevel).toBe('AWAKENED');
    });

    it('POST /learning/barrier/complete — should reject when no active barrier', async () => {
      await request(app.getHttpServer())
        .post('/learning/barrier/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════
  // B25.6: Failed barrier + retake
  // ══════════════════════════════════════════════

  describe('Barrier Failure & Retake (B25.6)', () => {
    let failBarrierId: string;

    it('should create new barrier for AWAKENED level after completing more days', async () => {
      // Complete 3 more days
      for (let d = 6; d <= 8; d++) {
        await request(app.getHttpServer())
          .post(`/learning/day/${d}/complete`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .get('/learning/barrier')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('barrierId');
      expect(res.body).toHaveProperty('level', 'AWAKENED');
      failBarrierId = res.body.barrierId;
    });

    it('should fail barrier with low scores', async () => {
      const barrier = await prisma.levelBarrier.findUnique({
        where: { id: failBarrierId },
      });
      const stages = barrier!.stages as Record<string, { questions?: Array<{ conceptId: string }>; pairs?: Array<{ conceptA: string; conceptB: string }> }>;

      // Submit all stages with low scores
      // Recall
      const questions = stages.recall!.questions!;
      for (const _q of questions) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
          JSON.stringify({ score: 0.2, feedback: 'Poor recall' }),
        );
      }
      await request(app.getHttpServer())
        .post('/learning/barrier/recall')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers: questions.map((q) => ({ conceptId: q.conceptId, answer: 'I dont remember this concept very well honestly.' })) })
        .expect(201);

      // Connect
      const pairs = stages.connect!.pairs!;
      for (const _p of pairs) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
          JSON.stringify({ score: 0.3, feedback: 'Weak connection' }),
        );
      }
      await request(app.getHttpServer())
        .post('/learning/barrier/connect')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pairs: pairs.map((p) => ({ conceptA: p.conceptA, conceptB: p.conceptB, explanation: 'They are somewhat related to each other in some way I think.' })) })
        .expect(201);

      // Apply
      jest.spyOn(aiService, 'chatCompletion').mockResolvedValue(
        JSON.stringify({ score: 0.2, feedback: 'Poor application', conceptsApplied: [] }),
      );
      await request(app.getHttpServer())
        .post('/learning/barrier/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ answers: [
          { situationIndex: 0, answer: 'I would just try to figure it out somehow maybe using what I learned.' },
          { situationIndex: 1, answer: 'I would tell them its complicated and they should read about it more.' },
        ] })
        .expect(201);

      // Defend (4 rounds)
      for (let r = 0; r < 3; r++) {
        jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce('Your argument is weak.');
        await request(app.getHttpServer())
          .post('/learning/barrier/defend')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ barrierId: failBarrierId, message: 'I think this is important but I cannot explain exactly why.', round: r })
          .expect(201);
      }

      // Final round with low score
      jest.spyOn(aiService, 'chatCompletion').mockResolvedValueOnce(
        'Failed to defend. {"score": 0.2, "feedback": "Weak defense"}',
      );
      await request(app.getHttpServer())
        .post('/learning/barrier/defend')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ barrierId: failBarrierId, message: 'I just think its true because it makes sense.', round: 3 })
        .expect(201);

      // Complete — should fail
      const res = await request(app.getHttpServer())
        .post('/learning/barrier/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body.passed).toBe(false);
      expect(res.body.totalScore).toBeLessThan(0.6);
      expect(res.body.newLevel).toBeNull();
    });

    it('GET /learning/barrier/retake — should show weak concepts', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/barrier/retake')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('attemptNumber', 1);
      expect(res.body).toHaveProperty('weakConcepts');
      expect(Array.isArray(res.body.weakConcepts)).toBe(true);
      expect(res.body).toHaveProperty('canRetake', true);
    });

    it('should still be AWAKENED level after failure', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.currentLevel).toBe('AWAKENED');
    });
  });
});
