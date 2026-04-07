/**
 * Auth E2E Test — Register → Login → Refresh flow.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/auth.e2e-spec.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e-auth-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  const testName = 'E2E Auth User';

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  // ── Register ────────────────────────────────────

  it('POST /auth/register — should register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    // Extract userId from token payload
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString(),
    );
    userId = payload.sub;
    expect(userId).toBeDefined();
  });

  it('POST /auth/register — should reject duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: testName })
      .expect(409);
  });

  // ── Login ───────────────────────────────────────

  it('POST /auth/login — should login with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/login — should reject wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'WrongPass999!' })
      .expect(401);
  });

  // ── Refresh ─────────────────────────────────────

  it('POST /auth/refresh — should return new token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.accessToken).not.toBe(accessToken);
  });

  it('POST /auth/refresh — should reject invalid token', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  // ── Protected route ─────────────────────────────

  it('GET /users/me — should work with valid access token', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', userId);
    expect(res.body).toHaveProperty('email', testEmail);
    expect(res.body).toHaveProperty('name', testName);
  });

  it('GET /users/me — should reject without token', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);
  });
});
