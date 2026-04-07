/**
 * Warmup E2E Test — Get today → Submit answers → Streak check.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/warmup.e2e-spec.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';

describe('Warmup (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let jwt: JwtService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    jwt = app.get(JwtService);

    // Create test user + stats
    const user = await prisma.user.create({
      data: {
        email: `e2e-warmup-${Date.now()}@test.com`,
        name: 'E2E Warmup User',
        passwordHash: 'not-used',
        stats: { create: {} },
      },
    });
    userId = user.id;
    accessToken = jwt.sign({ sub: userId, role: 'USER' });
  });

  afterAll(async () => {
    if (userId) {
      // Clean Redis keys
      const today = new Date().toISOString().slice(0, 10);
      await redis.del(`warmup:${userId}:${today}`).catch(() => {});
      await redis.del(`warmup:result:${userId}:${today}`).catch(() => {});
      await redis.del(`warmup:seen:${userId}`).catch(() => {});

      // Clean DB
      await prisma.warmupResult.deleteMany({ where: { userId } });
      await prisma.userStats.delete({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  // ── Get today ───────────────────────────────────

  it('GET /warmup/today — should return questions', async () => {
    const res = await request(app.getHttpServer())
      .get('/warmup/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('type', 'questions');
    expect(res.body).toHaveProperty('questions');
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBeGreaterThan(0);
    expect(res.body.questions.length).toBeLessThanOrEqual(5);
    expect(res.body).toHaveProperty('date');

    // Each question should have required fields
    for (const q of res.body.questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('text');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('category');
    }
  });

  it('GET /warmup/today — should return same questions on second call', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/warmup/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/warmup/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res1.body.questions.map((q: any) => q.id)).toEqual(
      res2.body.questions.map((q: any) => q.id),
    );
  });

  it('GET /warmup/today — should reject without auth', async () => {
    await request(app.getHttpServer())
      .get('/warmup/today')
      .expect(401);
  });

  // ── Submit ──────────────────────────────────────

  it('POST /warmup/submit — should accept answers and return result', async () => {
    // Get questions first
    const todayRes = await request(app.getHttpServer())
      .get('/warmup/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const questions = todayRes.body.questions;
    const answers = questions.map((q: any) => ({
      questionId: q.id,
      selectedIndex: 0, // always pick first option
    }));

    const res = await request(app.getHttpServer())
      .post('/warmup/submit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ answers })
      .expect(201);

    expect(res.body).toHaveProperty('type', 'result');
    expect(res.body).toHaveProperty('correct');
    expect(res.body).toHaveProperty('total', questions.length);
    expect(res.body).toHaveProperty('xpEarned');
    expect(res.body).toHaveProperty('streakDays');
    expect(res.body.streakDays).toBeGreaterThanOrEqual(1);
    expect(res.body.xpEarned).toBeGreaterThan(0);
  });

  it('POST /warmup/submit — should reject double submission (409)', async () => {
    await request(app.getHttpServer())
      .post('/warmup/submit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ answers: [] })
      .expect(409);
  });

  // ── After submit: today returns result ──────────

  it('GET /warmup/today — should return result after submission', async () => {
    const res = await request(app.getHttpServer())
      .get('/warmup/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('type', 'result');
    expect(res.body).toHaveProperty('correct');
    expect(res.body).toHaveProperty('streakDays');
  });
});
