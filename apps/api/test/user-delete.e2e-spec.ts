/**
 * User Delete E2E Test — GDPR account deletion (Legal.4).
 *
 * Covers: DELETE /users/me soft-delete, PII anonymization, re-login blocked,
 * idempotency (second delete → 404), GDPR export available before delete.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/user-delete.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';

jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('User Delete (GDPR) (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e-delete-${Date.now()}@test.com`;
  const testPassword = 'DeletePass123!';
  const testName = 'E2E Delete User';

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

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName,
        acceptedTerms: true,
      })
      .expect(201);

    accessToken = registerRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    userId = meRes.body.id;
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-delete-' } } })
      .catch(() => {});
    // Anonymized users have email=null; clean by id.
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe('Pre-delete: GDPR export available', () => {
    it('GET /users/me/export — returns full JSON dump', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('exportedAt');
      expect(res.body).toHaveProperty('version');
      expect(res.body.user).toMatchObject({ id: userId, email: testEmail, name: testName });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('DELETE /users/me', () => {
    it('401 without token', async () => {
      await request(app.getHttpServer()).delete('/users/me').expect(401);
    });

    it('200 with valid token — soft-deletes and anonymizes PII', async () => {
      const res = await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({ message: 'Account deleted successfully' });

      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.deletedAt).toBeInstanceOf(Date);
      expect(dbUser!.email).toBeNull();
      expect(dbUser!.telegramId).toBeNull();
      expect(dbUser!.telegramChatId).toBeNull();
      expect(dbUser!.passwordHash).toBeNull();
      expect(dbUser!.avatarUrl).toBeNull();
      expect(dbUser!.name).toBe('Удалённый пользователь');
    });

    it('404 on second delete (idempotent — already deleted)', async () => {
      await request(app.getHttpServer())
        .delete('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Post-delete: auth blocked', () => {
    it('POST /auth/login — 401 for deleted account', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(401);
    });
  });
});
