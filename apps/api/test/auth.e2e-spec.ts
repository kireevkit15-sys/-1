/**
 * Auth E2E Test — Full cycle: Register → Login → Refresh → Expired → Protected routes.
 *
 * BT.2: register → login → refresh → expired → refresh → ok
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/auth.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';

// Disable throttling for all E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth Full Cycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e-auth-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';
  const testName = 'E2E Auth User';

  let jwtService: JwtService;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  /** Create a manually expired token for testing */
  function signExpiredToken(
    payload: Record<string, unknown>,
    secret: string,
  ): string {
    // Sign with 0s expiry, then the token is immediately expired
    return jwtService.sign(payload, { secret, expiresIn: '0s' });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-auth-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. REGISTRATION
  // ══════════════════════════════════════════════

  describe('Registration', () => {
    it('POST /auth/register — should register a new user and return token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: testName })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;

      // Extract userId from access token payload
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1]!, 'base64').toString(),
      );
      userId = payload.sub;
      expect(userId).toBeDefined();
      expect(payload.email).toBe(testEmail);
      expect(payload.role).toBe('USER');
      expect(payload.type).toBe('access');
    });

    it('POST /auth/register — should reject duplicate email (409)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: testName })
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('POST /auth/register — should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: testPassword, name: testName })
        .expect(400);
    });

    it('POST /auth/register — should reject short password (<6 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: '12345', name: testName })
        .expect(400);
    });

    it('POST /auth/register — should reject missing name', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'noname@test.com', password: testPassword })
        .expect(400);
    });

    it('POST /auth/register — should reject short name (<2 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: testPassword, name: 'A' })
        .expect(400);
    });

    it('POST /auth/register — should reject empty body', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════
  // 2. LOGIN
  // ══════════════════════════════════════════════

  describe('Login', () => {
    it('POST /auth/login — should login with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      // New tokens should be different from register tokens
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;

      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1]!, 'base64').toString(),
      );
      expect(payload.sub).toBe(userId);
      expect(payload.type).toBe('access');
    });

    it('POST /auth/login — should reject wrong password (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPass999!' })
        .expect(401);

      expect(res.body.message).toContain('Invalid email or password');
    });

    it('POST /auth/login — should reject non-existent email (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: testPassword })
        .expect(401);

      expect(res.body.message).toContain('Invalid email or password');
    });

    it('POST /auth/login — should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════
  // 3. TOKEN REFRESH
  // ══════════════════════════════════════════════

  describe('Token Refresh', () => {
    it('POST /auth/refresh — should return new token pair with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // Verify we got a valid token (may be same if issued in same second)
      expect(typeof res.body.accessToken).toBe('string');

      // Save new tokens for subsequent tests
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /auth/refresh — chained refresh should work (refresh the refreshed token)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /auth/refresh — should reject completely invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', 'Bearer totally-invalid-token')
        .expect(401);
    });

    it('POST /auth/refresh — should reject access token used as refresh', async () => {
      // Access token is signed with JWT_SECRET, not JWT_REFRESH_SECRET
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('POST /auth/refresh — should reject request without Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });

    it('POST /auth/refresh — should reject expired refresh token', async () => {
      // Manually create a refresh token that is immediately expired
      const expiredRefresh = signExpiredToken(
        { sub: userId, email: testEmail, role: 'USER', type: 'refresh' },
        'razum-refresh-secret',
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${expiredRefresh}`)
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 4. PROTECTED ROUTES WITH ACCESS TOKEN
  // ══════════════════════════════════════════════

  describe('Protected Routes', () => {
    it('GET /users/me — should work with valid access token', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', userId);
      expect(res.body).toHaveProperty('email', testEmail);
      expect(res.body).toHaveProperty('name', testName);
    });

    it('GET /users/me — should reject without token (401)', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('GET /users/me — should reject with expired access token', async () => {
      const expiredAccess = signExpiredToken(
        { sub: userId, email: testEmail, role: 'USER', type: 'access' },
        'razum-dev-secret',
      );

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredAccess}`)
        .expect(401);
    });

    it('GET /users/me — should reject with malformed Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('GET /users/me — should reject refresh token used as access', async () => {
      // Refresh token is signed with JWT_REFRESH_SECRET, not JWT_SECRET
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });

    it('PATCH /users/me — should update profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
    });
  });

  // ══════════════════════════════════════════════
  // 5. FULL CYCLE: expired access → refresh → new access → ok
  // ══════════════════════════════════════════════

  describe('Full Cycle — expired → refresh → ok', () => {
    let expiredAccessToken: string;
    let validRefreshToken: string;

    it('Step 1: login to get fresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expiredAccessToken = res.body.accessToken;
      validRefreshToken = res.body.refreshToken;
    });

    it('Step 2: simulate expired access — create manually expired JWT', () => {
      expiredAccessToken = signExpiredToken(
        { sub: userId, email: testEmail, role: 'USER', type: 'access' },
        'razum-dev-secret',
      );
    });

    it('Step 3: expired access token is rejected', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredAccessToken}`)
        .expect(401);
    });

    it('Step 4: use refresh token to get new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${validRefreshToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      // Save new tokens
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('Step 5: new access token works on protected route', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', userId);
    });
  });

  // ══════════════════════════════════════════════
  // 6. ACCOUNT DELETION + RE-AUTH
  // ══════════════════════════════════════════════

  describe('Deleted Account', () => {
    const deletedEmail = `e2e-auth-deleted-${Date.now()}@test.com`;
    let deletedAccessToken: string;
    let deletedRefreshToken: string;

    it('should register a new user for deletion test', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: deletedEmail, password: testPassword, name: 'To Delete' })
        .expect(201);

      deletedAccessToken = res.body.accessToken;
      deletedRefreshToken = res.body.refreshToken;
    });

    it('should soft-delete the account', async () => {
      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${deletedAccessToken}`)
        .expect(200);
    });

    it('should reject login for deleted account (email anonymized)', async () => {
      // After soft-delete, email is set to null so user is not found
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: deletedEmail, password: testPassword })
        .expect(401);
    });

    it('should reject refresh for deleted account', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${deletedRefreshToken}`)
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 7. TOKEN PAYLOAD INTEGRITY
  // ══════════════════════════════════════════════

  describe('Token Payload', () => {
    it('access token should contain sub, email, role, type=access', () => {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1]!, 'base64').toString(),
      );

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(testEmail);
      expect(payload.role).toBe('USER');
      expect(payload.type).toBe('access');
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    it('refresh token should contain sub, email, role, type=refresh', () => {
      const payload = JSON.parse(
        Buffer.from(refreshToken.split('.')[1]!, 'base64').toString(),
      );

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(testEmail);
      expect(payload.role).toBe('USER');
      expect(payload.type).toBe('refresh');
      expect(payload.exp).toBeDefined();
    });

    it('refresh token should have longer expiry than access token', () => {
      const accessPayload = JSON.parse(
        Buffer.from(accessToken.split('.')[1]!, 'base64').toString(),
      );
      const refreshPayload = JSON.parse(
        Buffer.from(refreshToken.split('.')[1]!, 'base64').toString(),
      );

      expect(refreshPayload.exp).toBeGreaterThan(accessPayload.exp);
    });
  });
});
