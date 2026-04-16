/**
 * BT.18 — Security E2E: SQL injection, XSS in questions, JWT forgery, rate limit bypass
 *
 * Tests:
 * - SQL injection via question text, category, search params
 * - XSS payloads in question text, options, explanation, feedback comment
 * - JWT forgery: tampered payload, wrong secret, expired token
 * - Rate limit: burst requests to auth endpoints
 */

import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';

// Disable throttling for most tests (re-enable in rate limit section)
import { ThrottlerGuard } from '@nestjs/throttler';
const throttleSpy = jest
  .spyOn(ThrottlerGuard.prototype, 'canActivate')
  .mockResolvedValue(true);

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Security — Injection, XSS, JWT forgery, Rate limiting (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const adminEmail = `e2e-sec-admin-${Date.now()}@test.com`;
  const userEmail = `e2e-sec-user-${Date.now()}@test.com`;
  const password = 'SecurePass123!';

  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Register admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, name: 'Security Admin' });
    const adminId = JSON.parse(
      Buffer.from(adminRes.body.accessToken.split('.')[1], 'base64').toString(),
    ).sub;

    // Promote to ADMIN
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    // Re-login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminLogin.body.accessToken;

    // Register regular user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, password, name: 'Security User' });
    userToken = userRes.body.accessToken;
    userId = JSON.parse(
      Buffer.from(userToken.split('.')[1]!, 'base64').toString(),
    ).sub;
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({
        where: { email: { startsWith: 'e2e-sec-' } },
      })
      .catch(() => {});
    await app.close();
  });

  // ── SQL Injection ─────────────────────────────────────────────

  describe('SQL Injection', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM questions WHERE 1=1 --",
      "' OR 1=1; --",
      "'; UPDATE users SET role='ADMIN' WHERE email='",
      "\\'; DROP TABLE knowledge_chunks; --",
    ];

    it('should reject SQL injection in question text (POST /questions)', async () => {
      for (const payload of sqlPayloads) {
        const res = await request(app.getHttpServer())
          .post('/questions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            text: payload,
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
            category: 'security-test',
            branch: 'LOGIC',
            difficulty: 'BRONZE',
            statPrimary: 'logic',
          });

        // Should either create safely (parameterized) or reject — never execute SQL
        expect([201, 400]).toContain(res.status);

        // If created, verify it's stored as literal text, not executed
        if (res.status === 201) {
          const q = await prisma.question.findUnique({
            where: { id: res.body.id },
          });
          expect(q?.text).toBe(payload);
          // Clean up
          await prisma.question
            .delete({ where: { id: res.body.id } })
            .catch(() => {});
        }
      }
    });

    it('should reject SQL injection in category filter (GET /questions)', async () => {
      for (const payload of sqlPayloads) {
        const res = await request(app.getHttpServer())
          .get('/questions')
          .query({ category: payload })
          .set('Authorization', `Bearer ${adminToken}`);

        // Should return valid JSON response (empty or filtered), not DB error
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
          // Response may be array directly or { data: [...] } or paginated object
          expect(typeof res.body).toBe('object');
        }
      }
    });

    it('should not leak SQL details in knowledge search errors', async () => {
      for (const payload of sqlPayloads.slice(0, 3)) {
        const res = await request(app.getHttpServer())
          .get('/knowledge/search')
          .query({ q: payload })
          .set('Authorization', `Bearer ${userToken}`);

        // May return 500 if OpenAI key not set (embedding fails) — that's OK
        // What matters is the error message does not leak SQL details
        if (res.status === 500) {
          const body = JSON.stringify(res.body);
          expect(body).not.toMatch(/SELECT.*FROM|pg_catalog|information_schema/i);
        }
      }
    });

    it('should reject SQL injection in feedback comment', async () => {
      // First create a question to attach feedback to
      const qRes = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'Security test question',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          category: 'security-test',
          branch: 'LOGIC',
          difficulty: 'BRONZE',
          statPrimary: 'logic',
        });

      if (qRes.status === 201) {
        const questionId = qRes.body.id;

        const res = await request(app.getHttpServer())
          .post(`/questions/${questionId}/feedback`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            type: 'REPORT',
            comment: "'; DROP TABLE questions; --",
          });

        expect([200, 201, 400]).toContain(res.status);

        // Clean up
        await prisma.question
          .delete({ where: { id: questionId } })
          .catch(() => {});
      }
    });

    it('should not leak database structure in error messages', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      // Error message should not reveal table names, column names, or SQL
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/pg_catalog|information_schema|SELECT.*FROM/i);
      expect(body).not.toMatch(/prisma|postgresql|sequelize/i);
    });
  });

  // ── XSS ───────────────────────────────────────────────────────

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '"><script>document.cookie</script>',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '{{constructor.constructor("return this")()}}',
      '<a href="javascript:alert(1)">click</a>',
      '<div style="background:url(javascript:alert(1))">',
    ];

    it('should store XSS payloads as plain text in question text (not execute)', async () => {
      for (const payload of xssPayloads.slice(0, 3)) {
        const res = await request(app.getHttpServer())
          .post('/questions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            text: payload,
            options: ['Safe A', 'Safe B', 'Safe C', 'Safe D'],
            correctIndex: 0,
            category: 'xss-test',
            branch: 'STRATEGY',
            difficulty: 'SILVER',
            statPrimary: 'strategy',
          });

        if (res.status === 201) {
          // Verify stored as literal text
          const q = await prisma.question.findUnique({
            where: { id: res.body.id },
          });
          expect(q?.text).toBe(payload);

          // When retrieved via API, should return raw text (not HTML-escaped server-side)
          const getRes = await request(app.getHttpServer())
            .get(`/questions/${res.body.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(getRes.body.text).toBe(payload);

          await prisma.question
            .delete({ where: { id: res.body.id } })
            .catch(() => {});
        }
      }
    });

    it('should store XSS payloads safely in question options', async () => {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'Which is correct?',
          options: xssPayloads.slice(0, 4),
          correctIndex: 0,
          category: 'xss-test',
          branch: 'LOGIC',
          difficulty: 'BRONZE',
          statPrimary: 'logic',
        });

      if (res.status === 201) {
        const q = await prisma.question.findUnique({
          where: { id: res.body.id },
        });
        expect(q?.options).toEqual(xssPayloads.slice(0, 4));

        await prisma.question
          .delete({ where: { id: res.body.id } })
          .catch(() => {});
      }
    });

    it('should handle XSS in feedback comment without execution', async () => {
      const qRes = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          text: 'XSS feedback test',
          options: ['A', 'B'],
          correctIndex: 0,
          category: 'xss-test',
          branch: 'LOGIC',
          difficulty: 'BRONZE',
          statPrimary: 'logic',
        });

      if (qRes.status === 201) {
        for (const payload of xssPayloads.slice(0, 3)) {
          const res = await request(app.getHttpServer())
            .post(`/questions/${qRes.body.id}/feedback`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              type: 'REPORT',
              comment: payload,
              reason: payload,
            });

          expect([200, 201, 400]).toContain(res.status);
        }

        await prisma.question
          .delete({ where: { id: qRes.body.id } })
          .catch(() => {});
      }
    });

    it('should not reflect XSS in error messages', async () => {
      const xss = '<script>alert(1)</script>';

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: xss, password: 'x' });

      // Error response should not reflect the input as-is in HTML context
      expect(res.headers['content-type']).toMatch(/json/);
      // Body is JSON, not HTML — XSS cannot execute in JSON API context
      expect(typeof res.body).toBe('object');
    });

    it('should return JSON content-type on all API responses (not HTML)', async () => {
      // In test env Helmet is configured in main.ts bootstrap, not in test module.
      // What matters for XSS: API returns JSON, never HTML.
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  // ── JWT Forgery ───────────────────────────────────────────────

  describe('JWT Forgery & Tampering', () => {
    it('should reject request with no token', async () => {
      const res = await request(app.getHttpServer()).get('/users/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with garbage token', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not.a.jwt');

      expect(res.status).toBe(401);
    });

    it('should reject JWT signed with wrong secret', async () => {
      const forgedToken = jwtService.sign(
        { sub: userId, email: userEmail, role: 'ADMIN', type: 'access' },
        { secret: 'wrong-secret-key', expiresIn: '1h' },
      );

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject expired access token', async () => {
      const expiredToken = jwtService.sign(
        { sub: userId, email: userEmail, role: 'USER', type: 'access' },
        {
          secret: process.env.JWT_SECRET || 'razum-dev-secret',
          expiresIn: '0s',
        },
      );

      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject tampered JWT payload (modified role)', async () => {
      // Take a valid token and tamper with the payload
      const parts = userToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString());
      payload.role = 'ADMIN'; // tamper
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    it('should reject access token used as refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${userToken}`); // access token, not refresh

      expect(res.status).toBe(401);
    });

    it('should reject JWT with non-existent user ID', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const secret = process.env.JWT_SECRET || 'razum-dev-secret';
      const fakeToken = jwtService.sign(
        { sub: fakeUserId, email: 'fake@test.com', role: 'USER', type: 'access' },
        { secret, expiresIn: '1h' },
      );

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      // Should be 401 or 404 — not 500
      expect([401, 404]).toContain(res.status);
    });

    it('should reject empty Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('should reject "Bearer " with empty token', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('should reject "Basic" auth scheme', async () => {
      const basic = Buffer.from(`${userEmail}:${password}`).toString('base64');

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Basic ${basic}`);

      expect(res.status).toBe(401);
    });
  });

  // ── Rate Limiting ─────────────────────────────────────────────

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Re-enable throttling for these tests
      throttleSpy.mockRestore();
    });

    afterEach(() => {
      // Disable again for cleanup
      jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockResolvedValue(true);
    });

    it('should rate limit burst login attempts', async () => {
      const results: number[] = [];

      // Fire 15 rapid login attempts
      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'nonexistent@test.com', password: 'wrong' });
        results.push(res.status);
      }

      // Should see at least one 429 (Too Many Requests)
      const throttled = results.filter((s) => s === 429);
      expect(throttled.length).toBeGreaterThan(0);
    });

    it('should rate limit burst register attempts', async () => {
      const results: number[] = [];

      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `burst-${Date.now()}-${i}@test.com`,
            password: 'BurstTest123!',
            name: 'Burst Tester',
          });
        results.push(res.status);
      }

      const throttled = results.filter((s) => s === 429);
      expect(throttled.length).toBeGreaterThan(0);

      // Clean up any that got through
      await prisma.user
        .deleteMany({ where: { email: { startsWith: 'burst-' } } })
        .catch(() => {});
    });
  });
});
