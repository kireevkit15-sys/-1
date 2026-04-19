/**
 * Learning Path E2E Integration Tests (L25.2)
 *
 * Walks the full learning path flow as one integrated scenario:
 *   register → determine → start → today → interact → completeDay × N
 *
 * Verifies that the pieces compose correctly:
 *   - determination data flows into start() and is persisted on the path
 *   - the built path has days, day 1 has cards, today reflects currentDay
 *   - completeDay creates UserConceptMastery, advances currentDay,
 *     reports adaptation metrics, and flips barrierNeeded at day 5→6
 *   - status mirrors path progression after each day
 *   - different startZones produce different first-day concepts
 *   - skip-protection: cannot complete a future day
 *
 * These complement learning.e2e-spec.ts (which tests endpoints in
 * isolation) by exercising the *flow* end-to-end.
 *
 * Run: node --stack-size=65536 test/run-e2e.js learning-path.e2e-spec
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

describe('Learning Path Integration (e2e) — L25.2', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const ts = Date.now();
  const password = 'TestPass123!';
  const emailMain = `e2e-lp-main-${ts}@test.com`;
  const emailAlt = `e2e-lp-alt-${ts}@test.com`;
  const emailSkip = `e2e-lp-skip-${ts}@test.com`;
  const emailNoDet = `e2e-lp-nodet-${ts}@test.com`;

  let mainToken: string;
  let mainUserId: string;
  let mainPathId: string;

  const completeDay = async (token: string, dayNumber: number) =>
    request(app.getHttpServer())
      .post(`/learning/day/${dayNumber}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

  const getToday = async (token: string) =>
    request(app.getHttpServer())
      .get('/learning/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

  const getStatus = async (token: string) =>
    request(app.getHttpServer())
      .get('/learning/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

  const cleanupUserByEmail = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;
    await prisma.userConceptMastery.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.learningDay.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
    await prisma.levelBarrier.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
    await prisma.learningPath.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: user.id } }).catch(() => {});
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailMain, password, name: 'LP Main' })
      .expect(201);
    mainToken = reg.body.accessToken;
    mainUserId = (jwtService.decode(mainToken) as { sub: string }).sub;
  }, 30000);

  afterAll(async () => {
    for (const email of [emailMain, emailAlt, emailSkip, emailNoDet]) {
      await cleanupUserByEmail(email);
    }
    await app.close();
  }, 30000);

  // ──────────────────────────────────────────────────────────────────────
  // Step 1 — Determination produces deliveryStyle and start zone hint
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 1: determination', () => {
    it('returns startZone, painPoint, deliveryStyle from 5 answers', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${mainToken}`)
        .send({
          answers: [
            { situationIndex: 1, chosenOption: 0 },
            { situationIndex: 2, chosenOption: 1 },
            { situationIndex: 3, chosenOption: 2 },
            { situationIndex: 4, chosenOption: 1 },
            { situationIndex: 5, chosenOption: 0 },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('startZone');
      expect(res.body).toHaveProperty('painPoint');
      expect(res.body).toHaveProperty('deliveryStyle');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 2 — start() builds the route and persists determination data
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 2: build path', () => {
    it('creates LearningPath with persisted determination fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${mainToken}`)
        .send({
          startZone: 'STRATEGY',
          painPoint: 'LOGIC',
          deliveryStyle: 'analytical',
        })
        .expect(201);

      expect(res.body.currentLevel).toBe('SLEEPING');
      expect(res.body.currentDay).toBe(1);
      expect(res.body.totalDays).toBeGreaterThanOrEqual(5);
      expect(res.body.totalDays).toBeLessThanOrEqual(30);

      mainPathId = res.body.pathId;

      const path = await prisma.learningPath.findUnique({ where: { id: mainPathId } });
      expect(path?.startZone).toBe('STRATEGY');
      expect(path?.painPoint).toBe('LOGIC');
      expect(path?.deliveryStyle).toBe('analytical');
    });

    it('generates LearningDay rows numbered 1..N with concept refs and cards', async () => {
      const days = await prisma.learningDay.findMany({
        where: { pathId: mainPathId },
        orderBy: { dayNumber: 'asc' },
      });

      expect(days.length).toBeGreaterThanOrEqual(5);
      expect(days[0]!.dayNumber).toBe(1);
      expect(days[days.length - 1]!.dayNumber).toBe(days.length);

      const dayNumbers = days.map((d) => d.dayNumber);
      expect(new Set(dayNumbers).size).toBe(dayNumbers.length);

      for (const d of days) {
        expect(d.conceptId).toBeTruthy();
        expect(Array.isArray(d.cards)).toBe(true);
        expect((d.cards as unknown[]).length).toBeGreaterThan(0);
        expect(d.completedAt).toBeNull();
      }
    });

    it('refuses to start a second path for the same user', async () => {
      await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${mainToken}`)
        .send({ startZone: 'LOGIC', painPoint: 'STRATEGY', deliveryStyle: 'practical' })
        .expect(409);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 3 — today reflects currentDay and is consistent
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 3: today endpoint follows currentDay', () => {
    it('returns day 1 immediately after start', async () => {
      const res = await getToday(mainToken);
      expect(res.body.dayNumber).toBe(1);
      expect(res.body.concept).toHaveProperty('id');
      expect(res.body.concept).toHaveProperty('branch');
      expect(res.body.cards.length).toBeGreaterThan(0);
      expect(res.body.completedAt).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 4 — interact records get persisted into LearningDay.metrics
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 4: interact persists into day metrics', () => {
    it('records VIEW interactions on day 1 cards', async () => {
      const today = await getToday(mainToken);
      const day = await prisma.learningDay.findFirst({
        where: { pathId: mainPathId, dayNumber: today.body.dayNumber },
      });
      expect(day).not.toBeNull();

      for (let i = 0; i < (today.body.cards as unknown[]).length; i++) {
        await request(app.getHttpServer())
          .post('/learning/interact')
          .set('Authorization', `Bearer ${mainToken}`)
          .send({
            dayId: day!.id,
            cardIndex: i,
            type: 'VIEW',
            timeSpentMs: 4000 + i * 500,
          })
          .expect(201);
      }

      const refreshed = await prisma.learningDay.findUnique({ where: { id: day!.id } });
      const metrics = (refreshed?.metrics as Record<string, unknown> | null) ?? {};
      expect(Array.isArray(metrics.interactions)).toBe(true);
      expect((metrics.interactions as unknown[]).length).toBeGreaterThanOrEqual((today.body.cards as unknown[]).length);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 5 — completeDay × 5: barrier triggers when entering day 6
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 5: progression to first barrier', () => {
    it('completes day 1 → mastery record created, currentDay → 2, no barrier', async () => {
      const today = await getToday(mainToken);
      const conceptId = today.body.concept.id;

      const res = await completeDay(mainToken, 1);
      expect(res.body.completedDay).toBe(1);
      expect(res.body.nextDay).toBe(2);
      expect(res.body.barrierNeeded).toBe(false);
      expect(res.body.metrics).toHaveProperty('confidence');
      expect(res.body.metrics).toHaveProperty('masteryDelta');

      const mastery = await prisma.userConceptMastery.findUnique({
        where: { userId_conceptId: { userId: mainUserId, conceptId } },
      });
      expect(mastery).not.toBeNull();
      expect(mastery!.mastery).toBeGreaterThan(0);
      expect(mastery!.lastTestedAt).not.toBeNull();
    });

    it('completes days 2..5 sequentially, status updates each step, day 6 entry triggers barrier', async () => {
      let lastBarrierFlag = false;
      let lastBarrierLevel: string | null = null;

      for (let day = 2; day <= 5; day++) {
        const res = await completeDay(mainToken, day);
        expect(res.body.completedDay).toBe(day);
        expect(res.body.nextDay).toBe(day + 1);
        lastBarrierFlag = res.body.barrierNeeded;
        lastBarrierLevel = res.body.barrierLevel ?? null;

        const status = await getStatus(mainToken);
        expect(status.body.currentDay).toBe(day + 1);
        expect(status.body.completedDays).toBe(day);
      }

      expect(lastBarrierFlag).toBe(true);
      expect(lastBarrierLevel).toBeTruthy();
    });

    it('today now points to day 6 and exposes a different concept than day 1', async () => {
      const status = await getStatus(mainToken);
      expect(status.body.currentDay).toBe(6);

      const day6 = await getToday(mainToken);
      expect(day6.body.dayNumber).toBe(6);

      const day1 = await prisma.learningDay.findFirst({
        where: { pathId: mainPathId, dayNumber: 1 },
        select: { conceptId: true },
      });
      expect(day6.body.concept.id).not.toBe(day1?.conceptId);
    });

    it('records mastery for every completed concept', async () => {
      const completed = await prisma.learningDay.findMany({
        where: { pathId: mainPathId, completedAt: { not: null } },
        select: { conceptId: true },
      });
      const conceptIds = completed.map((d) => d.conceptId);

      const masteries = await prisma.userConceptMastery.findMany({
        where: { userId: mainUserId, conceptId: { in: conceptIds } },
      });
      expect(masteries.length).toBe(conceptIds.length);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Skip-protection: cannot complete a future day
  // ──────────────────────────────────────────────────────────────────────

  describe('Skip protection', () => {
    let skipToken: string;

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailSkip, password, name: 'Skip Test' })
        .expect(201);
      skipToken = reg.body.accessToken;
      await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${skipToken}`)
        .send({ startZone: 'STRATEGY', painPoint: 'LOGIC', deliveryStyle: 'practical' })
        .expect(201);
    });

    it('rejects completing day 3 while currentDay is 1', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/3/complete')
        .set('Authorization', `Bearer ${skipToken}`)
        .expect(400);
    });

    it('rejects completing the same day twice', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/1/complete')
        .set('Authorization', `Bearer ${skipToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/learning/day/1/complete')
        .set('Authorization', `Bearer ${skipToken}`)
        .expect(409);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Different startZones produce different paths
  // ──────────────────────────────────────────────────────────────────────

  describe('Determination → path divergence', () => {
    let altToken: string;

    beforeAll(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailAlt, password, name: 'Alt Path' })
        .expect(201);
      altToken = reg.body.accessToken;
    });

    it('LOGIC startZone produces a different first-day concept than STRATEGY startZone', async () => {
      await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${altToken}`)
        .send({ startZone: 'LOGIC', painPoint: 'STRATEGY', deliveryStyle: 'analytical' })
        .expect(201);

      const altDay1 = await getToday(altToken);
      const mainDay1 = await prisma.learningDay.findFirst({
        where: { pathId: mainPathId, dayNumber: 1 },
        select: { conceptId: true, concept: { select: { branch: true } } },
      });

      // Either the concept itself or the branch differs
      const sameConcept = altDay1.body.concept.id === mainDay1?.conceptId;
      const sameBranch = altDay1.body.concept.branch === mainDay1?.concept?.branch;
      expect(sameConcept && sameBranch).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Path can be built without prior determination (defaults)
  // ──────────────────────────────────────────────────────────────────────

  describe('Path without determination', () => {
    it('creates a usable path with empty determination input', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailNoDet, password, name: 'No Determination' })
        .expect(201);
      const token = reg.body.accessToken;

      const res = await request(app.getHttpServer())
        .post('/learning/start')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(201);

      expect(res.body.totalDays).toBeGreaterThan(0);

      const today = await getToday(token);
      expect(today.body.dayNumber).toBe(1);
      expect(today.body.cards.length).toBeGreaterThan(0);
    });
  });
});
