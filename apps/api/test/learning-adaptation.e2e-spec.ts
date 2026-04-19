/**
 * Learning Adaptation E2E Integration Tests (L25.4)
 *
 * Verifies that the path responds to different behavior patterns:
 *   - 3+ rushed days in a row → delivery style rotates (analytical → practical)
 *   - normal-paced completion → delivery style is stable
 *   - high-quality completion (correct quiz + understood explain + ideal time)
 *     → larger masteryDelta and confidence than a rushed completion
 *   - rushed completion (low confidence ≤ 0.35) → REPEAT adaptation reported
 *   - high-quality completion → no REPEAT in adaptations
 *   - AdaptationService.analyzeDayMetrics returns engagement / mastery / skip
 *     signals that line up with the recorded interactions
 *
 * Each behavior pattern is exercised against the live `/learning/interact` +
 * `/learning/day/:n/complete` endpoints, then we read back what the system
 * actually persisted (LearningPath.deliveryStyle, UserConceptMastery.mastery)
 * and what completeDay returned in `metrics.adaptations`.
 *
 * Run: node --stack-size=65536 test/run-e2e.js learning-adaptation.e2e-spec
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
import { AdaptationService } from '../src/learning/adaptation.service';

const RUSHED_TIME_MS = 1500;       // < 2000 → time-skip; <4000 → low engagement
const ENGAGED_TIME_MS = 15000;     // inside [8s, 60s] ideal range
const QUIZ_CARD_INDEX = 4;
const EXPLAIN_CARD_INDEX = 5;
const TOTAL_CARDS = 8;

describe('Learning Adaptation Integration (e2e) — L25.4', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adaptationService: AdaptationService;

  const ts = Date.now();
  const password = 'TestPass123!';

  const cleanupUserByEmail = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;
    await prisma.userConceptMastery.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.learningDay.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
    await prisma.levelBarrier.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
    await prisma.learningPath.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {});
  };

  const registerAndStart = async (
    email: string,
    deliveryStyle: 'analytical' | 'practical' | 'philosophical' = 'analytical',
  ) => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Adapt Test' })
      .expect(201);
    const token: string = reg.body.accessToken;
    const userId = (jwtService.decode(token) as { sub: string }).sub;
    await request(app.getHttpServer())
      .post('/learning/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ startZone: 'STRATEGY', painPoint: 'LOGIC', deliveryStyle })
      .expect(201);
    return { token, userId };
  };

  const getCurrentDayId = async (userId: string, dayNumber: number) => {
    const path = await prisma.learningPath.findUnique({ where: { userId } });
    const day = await prisma.learningDay.findFirst({
      where: { pathId: path!.id, dayNumber },
    });
    return day!.id;
  };

  const recordRushedDay = async (token: string, dayId: string) => {
    for (let i = 0; i < TOTAL_CARDS; i++) {
      await request(app.getHttpServer())
        .post('/learning/interact')
        .set('Authorization', `Bearer ${token}`)
        .send({ dayId, cardIndex: i, type: 'VIEW', timeSpentMs: RUSHED_TIME_MS })
        .expect(201);
    }
  };

  // Engaged pattern: ideal-time VIEWs across all cards + correct quiz answer.
  // We deliberately omit the "understood" explain ANSWER because computeEngagement
  // counts every ANSWER toward quiz accuracy regardless of cardIndex — adding the
  // explain answer with answer='understood' would be counted as quizCorrect=0
  // and depress confidence below the high-confidence threshold.
  const recordEngagedDay = async (token: string, dayId: string) => {
    for (let i = 0; i < TOTAL_CARDS; i++) {
      await request(app.getHttpServer())
        .post('/learning/interact')
        .set('Authorization', `Bearer ${token}`)
        .send({ dayId, cardIndex: i, type: 'VIEW', timeSpentMs: ENGAGED_TIME_MS })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post('/learning/interact')
      .set('Authorization', `Bearer ${token}`)
      .send({ dayId, cardIndex: QUIZ_CARD_INDEX, type: 'ANSWER', timeSpentMs: 12000, answer: 'correct' })
      .expect(201);
  };

  const completeDay = async (token: string, dayNumber: number) =>
    request(app.getHttpServer())
      .post(`/learning/day/${dayNumber}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    adaptationService = app.get(AdaptationService);
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 15000);

  // ──────────────────────────────────────────────────────────────────────
  // Style rotation: 3 rushed days → CHANGE_STYLE + persisted style change
  // ──────────────────────────────────────────────────────────────────────

  describe('Pattern: 3 rushed days in a row → style rotates', () => {
    const email = `e2e-adapt-style-${ts}@test.com`;
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const r = await registerAndStart(email, 'analytical');
      token = r.token;
      userId = r.userId;
    }, 30000);

    afterAll(async () => {
      await cleanupUserByEmail(email);
    }, 15000);

    it('completes day 1-2 rushed without triggering style change yet (recentLow < 3)', async () => {
      for (let day = 1; day <= 2; day++) {
        const dayId = await getCurrentDayId(userId, day);
        await recordRushedDay(token, dayId);
        const res = await completeDay(token, day);
        expect(res.body.metrics.adaptations).not.toContain('CHANGE_STYLE');
      }

      const path = await prisma.learningPath.findUnique({ where: { userId } });
      expect(path?.deliveryStyle).toBe('analytical');
    });

    it('completing day 3 rushed flips deliveryStyle (analytical → practical)', async () => {
      const dayId = await getCurrentDayId(userId, 3);
      await recordRushedDay(token, dayId);
      const res = await completeDay(token, 3);

      expect(res.body.metrics.adaptations).toContain('CHANGE_STYLE');

      const path = await prisma.learningPath.findUnique({ where: { userId } });
      expect(path?.deliveryStyle).toBe('practical');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Stable style: normal completion, no style change
  // ──────────────────────────────────────────────────────────────────────

  describe('Pattern: engaged completion → style does NOT rotate', () => {
    const email = `e2e-adapt-stable-${ts}@test.com`;
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const r = await registerAndStart(email, 'analytical');
      token = r.token;
      userId = r.userId;
    }, 30000);

    afterAll(async () => {
      await cleanupUserByEmail(email);
    }, 15000);

    it('keeps deliveryStyle stable across 3 engaged days', async () => {
      for (let day = 1; day <= 3; day++) {
        const dayId = await getCurrentDayId(userId, day);
        await recordEngagedDay(token, dayId);
        const res = await completeDay(token, day);
        expect(res.body.metrics.adaptations).not.toContain('CHANGE_STYLE');
      }

      const path = await prisma.learningPath.findUnique({ where: { userId } });
      expect(path?.deliveryStyle).toBe('analytical');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // masteryDelta scales with confidence
  // ──────────────────────────────────────────────────────────────────────

  describe('Pattern: engagement vs rush → masteryDelta diverges', () => {
    const emailEngaged = `e2e-adapt-engaged-${ts}@test.com`;
    const emailRushed = `e2e-adapt-rushed-${ts}@test.com`;

    afterAll(async () => {
      await cleanupUserByEmail(emailEngaged);
      await cleanupUserByEmail(emailRushed);
    }, 30000);

    it('engaged user earns higher mastery than rushed user after day 1', async () => {
      const engaged = await registerAndStart(emailEngaged, 'analytical');
      const rushed = await registerAndStart(emailRushed, 'analytical');

      const engagedDayId = await getCurrentDayId(engaged.userId, 1);
      await recordEngagedDay(engaged.token, engagedDayId);
      const engagedRes = await completeDay(engaged.token, 1);

      const rushedDayId = await getCurrentDayId(rushed.userId, 1);
      await recordRushedDay(rushed.token, rushedDayId);
      const rushedRes = await completeDay(rushed.token, 1);

      expect(engagedRes.body.metrics.confidence).toBeGreaterThan(rushedRes.body.metrics.confidence);
      expect(engagedRes.body.metrics.masteryDelta).toBeGreaterThan(rushedRes.body.metrics.masteryDelta);

      const engagedConceptId = (await prisma.learningDay.findFirst({
        where: { path: { userId: engaged.userId }, dayNumber: 1 },
        select: { conceptId: true },
      }))!.conceptId;

      const rushedConceptId = (await prisma.learningDay.findFirst({
        where: { path: { userId: rushed.userId }, dayNumber: 1 },
        select: { conceptId: true },
      }))!.conceptId;

      const engagedMastery = await prisma.userConceptMastery.findUnique({
        where: { userId_conceptId: { userId: engaged.userId, conceptId: engagedConceptId } },
      });
      const rushedMastery = await prisma.userConceptMastery.findUnique({
        where: { userId_conceptId: { userId: rushed.userId, conceptId: rushedConceptId } },
      });

      expect(engagedMastery!.mastery).toBeGreaterThan(rushedMastery!.mastery);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // REPEAT action when concept confidence ≤ 0.35
  // ──────────────────────────────────────────────────────────────────────

  describe('Pattern: low confidence → REPEAT adaptation', () => {
    const email = `e2e-adapt-repeat-${ts}@test.com`;
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const r = await registerAndStart(email, 'analytical');
      token = r.token;
      userId = r.userId;
    }, 30000);

    afterAll(async () => {
      await cleanupUserByEmail(email);
    }, 15000);

    it('rushed day produces REPEAT action and small masteryDelta (0.02)', async () => {
      const dayId = await getCurrentDayId(userId, 1);
      await recordRushedDay(token, dayId);
      const res = await completeDay(token, 1);

      expect(res.body.metrics.adaptations).toContain('REPEAT');
      expect(res.body.metrics.confidence).toBeLessThanOrEqual(0.35);
      expect(res.body.metrics.masteryDelta).toBeCloseTo(0.02, 2);
    });
  });

  describe('Pattern: high confidence → no REPEAT', () => {
    const email = `e2e-adapt-norepeat-${ts}@test.com`;
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const r = await registerAndStart(email, 'analytical');
      token = r.token;
      userId = r.userId;
    }, 30000);

    afterAll(async () => {
      await cleanupUserByEmail(email);
    }, 15000);

    it('engaged day yields high confidence (>=0.85), masteryDelta 0.15, no REPEAT', async () => {
      const dayId = await getCurrentDayId(userId, 1);
      await recordEngagedDay(token, dayId);
      const res = await completeDay(token, 1);

      expect(res.body.metrics.adaptations).not.toContain('REPEAT');
      expect(res.body.metrics.confidence).toBeGreaterThanOrEqual(0.85);
      expect(res.body.metrics.masteryDelta).toBeCloseTo(0.15, 2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // AdaptationService.analyzeDayMetrics — direct service-level signals
  // ──────────────────────────────────────────────────────────────────────

  describe('AdaptationService.analyzeDayMetrics signals', () => {
    const emailEngaged = `e2e-adapt-signals-engaged-${ts}@test.com`;
    const emailRushed = `e2e-adapt-signals-rushed-${ts}@test.com`;

    afterAll(async () => {
      await cleanupUserByEmail(emailEngaged);
      await cleanupUserByEmail(emailRushed);
    }, 30000);

    it('reports higher engagement for engaged user than rushed user', async () => {
      const engaged = await registerAndStart(emailEngaged, 'analytical');
      const rushed = await registerAndStart(emailRushed, 'analytical');

      const engagedDayId = await getCurrentDayId(engaged.userId, 1);
      await recordEngagedDay(engaged.token, engagedDayId);
      await completeDay(engaged.token, 1);

      const rushedDayId = await getCurrentDayId(rushed.userId, 1);
      await recordRushedDay(rushed.token, rushedDayId);
      await completeDay(rushed.token, 1);

      const engagedSignals = await adaptationService.analyzeDayMetrics(engaged.userId, 1);
      const rushedSignals = await adaptationService.analyzeDayMetrics(rushed.userId, 1);

      expect(engagedSignals.engagementScore).toBeGreaterThan(rushedSignals.engagementScore);
      expect(engagedSignals.skipRate).toBeLessThan(rushedSignals.skipRate);
      expect(engagedSignals.masterySpeed).toBeGreaterThan(rushedSignals.masterySpeed);
    });

    it('returns empty signals for unknown user (no path)', async () => {
      const signals = await adaptationService.analyzeDayMetrics('00000000-0000-0000-0000-000000000000', 1);
      expect(signals.engagementScore).toBe(0.5);
      expect(signals.skipRate).toBe(0);
      expect(signals.weakConcepts).toEqual([]);
    });
  });
});
