/**
 * Learn E2E Test — List modules → Get detail → Submit progress.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/learn.e2e-spec.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Learn (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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
    jwt = app.get(JwtService);

    // Create test user + stats
    const user = await prisma.user.create({
      data: {
        email: `e2e-learn-${Date.now()}@test.com`,
        name: 'E2E Learn User',
        passwordHash: 'not-used',
        stats: { create: {} },
      },
    });
    userId = user.id;
    accessToken = jwt.sign({ sub: userId, role: 'USER' });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.userModuleProgress.deleteMany({ where: { userId } });
      await prisma.userStats.delete({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  // ── List modules ────────────────────────────────

  it('GET /modules — should list modules', async () => {
    const res = await request(app.getHttpServer())
      .get('/modules')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /modules?branch=STRATEGY — should filter by branch', async () => {
    const res = await request(app.getHttpServer())
      .get('/modules?branch=STRATEGY')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const m of res.body) {
      expect(m.branch).toBe('STRATEGY');
    }
  });

  it('GET /modules — should reject without auth', async () => {
    await request(app.getHttpServer())
      .get('/modules')
      .expect(401);
  });

  // ── Module detail ───────────────────────────────

  it('GET /modules/:id — should return module detail', async () => {
    // Get first module
    const listRes = await request(app.getHttpServer())
      .get('/modules')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    if (listRes.body.length === 0) {
      console.warn('No modules in DB — skipping detail test');
      return;
    }

    const moduleId = listRes.body[0].id;
    const res = await request(app.getHttpServer())
      .get(`/modules/${moduleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', moduleId);
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('branch');
  });

  it('GET /modules/:id — should 404 for unknown id', async () => {
    await request(app.getHttpServer())
      .get('/modules/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  // ── Submit progress ─────────────────────────────

  it('POST /modules/:id/progress — should mark a question completed', async () => {
    // Get a module with questions
    const listRes = await request(app.getHttpServer())
      .get('/modules')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    if (listRes.body.length === 0) {
      console.warn('No modules in DB — skipping progress test');
      return;
    }

    const moduleId = listRes.body[0].id;
    const detailRes = await request(app.getHttpServer())
      .get(`/modules/${moduleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    if (!detailRes.body.questionIds || detailRes.body.questionIds.length === 0) {
      console.warn('Module has no questions — skipping progress test');
      return;
    }

    const questionId = detailRes.body.questionIds[0];

    const res = await request(app.getHttpServer())
      .post(`/modules/${moduleId}/progress`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId })
      .expect(201);

    expect(res.body).toHaveProperty('completedQuestions');
    expect(res.body.completedQuestions).toContain(questionId);
  });
});
