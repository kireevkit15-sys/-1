/**
 * Notifications E2E Test — Subscribe, unsubscribe, list subscriptions.
 *
 * BT.10
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/notifications.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationService } from '../src/notification/notification.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('Notifications E2E (BT.10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  let userToken: string;
  let userId: string;

  const testEndpoint = `https://push.example.com/e2e-test-${Date.now()}`;
  const testP256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWA8=';
  const testAuth = 'tBHItJI5svbpC7htfNfGYA==';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    notificationService = app.get(NotificationService);

    // Register user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-notif-${Date.now()}@test.com`,
        password: 'Notif123!',
        name: 'E2E Notif User',
      })
      .expect(201);

    userToken = userRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(userToken.split('.')[1], 'base64').toString(),
    );
    userId = payload.sub;
  });

  afterAll(async () => {
    await prisma.pushSubscription
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.userStats
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-notif-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. SUBSCRIBE
  // ══════════════════════════════════════════════

  describe('Subscribe', () => {
    it('POST /notifications/subscribe — should subscribe to push', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint: testEndpoint, p256dh: testP256dh, auth: testAuth })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('endpoint', testEndpoint);
      expect(res.body).toHaveProperty('createdAt');
    });

    it('POST /notifications/subscribe — duplicate endpoint should update (upsert)', async () => {
      const newAuth = 'updated_auth_key_123==';

      const res = await request(app.getHttpServer())
        .post('/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint: testEndpoint, p256dh: testP256dh, auth: newAuth })
        .expect(201);

      expect(res.body.endpoint).toBe(testEndpoint);

      // Verify only one subscription exists
      const subs = await prisma.pushSubscription.findMany({
        where: { userId, endpoint: testEndpoint },
      });
      expect(subs.length).toBe(1);
      expect(subs[0].auth).toBe(newAuth);
    });

    it('POST /notifications/subscribe — should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/notifications/subscribe')
        .send({ endpoint: testEndpoint, p256dh: testP256dh, auth: testAuth })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 2. LIST SUBSCRIPTIONS
  // ══════════════════════════════════════════════

  describe('List subscriptions', () => {
    it('GET /notifications/subscriptions — should return user subscriptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const sub = res.body.find((s: any) => s.endpoint === testEndpoint);
      expect(sub).toBeDefined();
      expect(sub).toHaveProperty('id');
      expect(sub).toHaveProperty('createdAt');
    });

    it('GET /notifications/subscriptions — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/notifications/subscriptions')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 3. MULTIPLE SUBSCRIPTIONS
  // ══════════════════════════════════════════════

  describe('Multiple subscriptions', () => {
    const secondEndpoint = `https://push.example.com/e2e-second-${Date.now()}`;

    it('Should support multiple endpoints per user', async () => {
      await request(app.getHttpServer())
        .post('/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint: secondEndpoint, p256dh: testP256dh, auth: testAuth })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/notifications/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    afterAll(async () => {
      await prisma.pushSubscription
        .deleteMany({ where: { endpoint: secondEndpoint } })
        .catch(() => {});
    });
  });

  // ══════════════════════════════════════════════
  // 4. UNSUBSCRIBE
  // ══════════════════════════════════════════════

  describe('Unsubscribe', () => {
    it('DELETE /notifications/subscribe — should remove subscription', async () => {
      const res = await request(app.getHttpServer())
        .delete('/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint: testEndpoint })
        .expect(200);

      expect(res.body).toHaveProperty('removed', true);
    });

    it('DELETE /notifications/subscribe — should return false for non-existent', async () => {
      const res = await request(app.getHttpServer())
        .delete('/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ endpoint: 'https://push.example.com/non-existent' })
        .expect(200);

      expect(res.body).toHaveProperty('removed', false);
    });

    it('DELETE /notifications/subscribe — should reject without auth', async () => {
      await request(app.getHttpServer())
        .delete('/notifications/subscribe')
        .send({ endpoint: testEndpoint })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 5. LIST AFTER UNSUBSCRIBE
  // ══════════════════════════════════════════════

  describe('List after unsubscribe', () => {
    it('GET /notifications/subscriptions — should not contain removed endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/subscriptions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const removed = res.body.find((s: any) => s.endpoint === testEndpoint);
      expect(removed).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════
  // 6. SERVICE-LEVEL TESTS
  // ══════════════════════════════════════════════

  describe('Service-level', () => {
    const serviceEndpoint = `https://push.example.com/service-test-${Date.now()}`;

    it('subscribe — should create subscription', async () => {
      const result = await notificationService.subscribe(userId, {
        endpoint: serviceEndpoint,
        p256dh: testP256dh,
        auth: testAuth,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('endpoint', serviceEndpoint);
    });

    it('getUserSubscriptions — should include service subscription', async () => {
      const subs = await notificationService.getUserSubscriptions(userId);
      expect(Array.isArray(subs)).toBe(true);
      const found = subs.find((s) => s.endpoint === serviceEndpoint);
      expect(found).toBeDefined();
    });

    it('unsubscribe — should remove', async () => {
      const removed = await notificationService.unsubscribe(userId, serviceEndpoint);
      expect(removed).toBe(true);
    });

    it('unsubscribe again — should return false', async () => {
      const removed = await notificationService.unsubscribe(userId, serviceEndpoint);
      expect(removed).toBe(false);
    });
  });
});
