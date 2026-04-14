/**
 * B25.13: Security tests for Learning System
 * - User cannot skip levels
 * - User cannot forge barrier answers
 * - User cannot access another user's learning path
 * - User cannot complete days out of order
 *
 * Run: node --stack-size=65536 test/run-e2e.js security/learning-security
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';

jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Learning Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userAEmail = `e2e-sec-a-${Date.now()}@test.com`;
  const userBEmail = `e2e-sec-b-${Date.now()}@test.com`;
  const password = 'TestPass123!';

  let tokenA: string;
  let tokenB: string;
  let userAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService);

    // Register two users
    const resA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userAEmail, password, name: 'User A' })
      .expect(201);
    tokenA = resA.body.accessToken;

    const resB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userBEmail, password, name: 'User B' })
      .expect(201);
    tokenB = resB.body.accessToken;

    userAId = (jwtService.decode(tokenA) as { sub: string }).sub;

    // User A creates a learning path
    await request(app.getHttpServer())
      .post('/learning/start')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ startZone: 'STRATEGY' })
      .expect(201);
  }, 30000);

  afterAll(async () => {
    for (const email of [userAEmail, userBEmail]) {
      const user = await prisma.user.findFirst({ where: { email } });
      if (user) {
        await prisma.userConceptMastery.deleteMany({ where: { userId: user.id } }).catch(() => {});
        await prisma.levelBarrier.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
        await prisma.learningDay.deleteMany({ where: { path: { userId: user.id } } }).catch(() => {});
        await prisma.learningPath.deleteMany({ where: { userId: user.id } }).catch(() => {});
      }
    }
    await prisma.user.deleteMany({ where: { email: { in: [userAEmail, userBEmail] } } }).catch(() => {});
    await app.close();
  }, 15000);

  // ══════════════════════════════════════════════
  // Auth enforcement
  // ══════════════════════════════════════════════

  describe('Auth enforcement', () => {
    const endpoints = [
      { method: 'get', path: '/learning/today' },
      { method: 'get', path: '/learning/status' },
      { method: 'get', path: '/learning/mastery' },
      { method: 'get', path: '/learning/barrier' },
      { method: 'get', path: '/learning/barrier/retake' },
      { method: 'post', path: '/learning/determine' },
      { method: 'post', path: '/learning/start' },
      { method: 'post', path: '/learning/explain' },
      { method: 'post', path: '/learning/barrier/recall' },
      { method: 'post', path: '/learning/barrier/complete' },
    ];

    for (const ep of endpoints) {
      it(`${ep.method.toUpperCase()} ${ep.path} — should return 401 without token`, async () => {
        const req = ep.method === 'get'
          ? request(app.getHttpServer()).get(ep.path)
          : request(app.getHttpServer()).post(ep.path).send({});

        await req.expect(401);
      });
    }
  });

  // ══════════════════════════════════════════════
  // Day skip prevention
  // ══════════════════════════════════════════════

  describe('Day skip prevention', () => {
    it('should not allow completing day 3 when on day 1', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/3/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);
    });

    it('should not allow completing day 0 (not found)', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/0/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });

    it('should not allow completing negative day (not found)', async () => {
      await request(app.getHttpServer())
        .post('/learning/day/-1/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════
  // Cross-user isolation
  // ══════════════════════════════════════════════

  describe('Cross-user isolation', () => {
    it('User B should not see User A\'s learning path', async () => {
      const resA = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const resB = await request(app.getHttpServer())
        .get('/learning/status')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      // User A has a path, User B does not
      expect(resA.body.hasPath).toBe(true);
      expect(resB.body.hasPath).toBe(false);
    });

    it('User B should not access User A\'s today endpoint', async () => {
      // User B has no path, should get 404
      await request(app.getHttpServer())
        .get('/learning/today')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('User B cannot interact with User A\'s learning day', async () => {
      // Get User A's day
      const dayA = await prisma.learningDay.findFirst({
        where: { path: { userId: userAId } },
      });

      if (!dayA) return;

      await request(app.getHttpServer())
        .post('/learning/interact')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          dayId: dayA.id,
          cardIndex: 0,
          type: 'VIEW',
        })
        .expect(404); // Should fail because User B's path doesn't have this day
    });
  });

  // ══════════════════════════════════════════════
  // Barrier forgery prevention
  // ══════════════════════════════════════════════

  describe('Barrier forgery prevention', () => {
    it('should not allow barrier/complete without completing all stages', async () => {
      // Complete enough days to trigger barrier
      for (let d = 1; d <= 5; d++) {
        await request(app.getHttpServer())
          .post(`/learning/day/${d}/complete`)
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(201);
      }

      // Create barrier
      await request(app.getHttpServer())
        .get('/learning/barrier')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // Try to complete without doing stages
      await request(app.getHttpServer())
        .post('/learning/barrier/complete')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);
    });

    it('should reject invalid UUID in barrier defend', async () => {
      await request(app.getHttpServer())
        .post('/learning/barrier/defend')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          barrierId: 'not-a-valid-uuid',
          message: 'Trying to forge a barrier response here.',
        })
        .expect(400);
    });

    it('should reject defend for nonexistent barrier ID', async () => {
      await request(app.getHttpServer())
        .post('/learning/barrier/defend')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          barrierId: '00000000-0000-0000-0000-000000000000',
          message: 'Trying to access a fake barrier here.',
        })
        .expect(404);
    });
  });

  // ══════════════════════════════════════════════
  // Input validation
  // ══════════════════════════════════════════════

  describe('Input validation', () => {
    it('should reject determination with out-of-range situationIndex', async () => {
      await request(app.getHttpServer())
        .post('/learning/determine')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          answers: [
            { situationIndex: 99, chosenOption: 0 },
            { situationIndex: 100, chosenOption: 1 },
            { situationIndex: 101, chosenOption: 2 },
            { situationIndex: 102, chosenOption: 3 },
            { situationIndex: 103, chosenOption: 0 },
          ],
        })
        .expect(400);
    });

    it('should reject explain with non-UUID conceptId', async () => {
      await request(app.getHttpServer())
        .post('/learning/explain')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          conceptId: 'sql-injection-attempt; DROP TABLE concepts;',
          explanation: 'Testing injection in conceptId field here.',
        })
        .expect(400);
    });

    it('should reject recall with empty answer', async () => {
      await request(app.getHttpServer())
        .post('/learning/barrier/recall')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          answers: [
            { conceptId: '00000000-0000-0000-0000-000000000001', answer: '' },
          ],
        })
        .expect(400);
    });
  });
});
