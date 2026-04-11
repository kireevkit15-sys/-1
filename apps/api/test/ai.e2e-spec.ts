/**
 * AI E2E Test — Dialogue CRUD, message exchange, daily limit, quota.
 *
 * BT.7
 *
 * AI API calls are mocked to avoid real external requests.
 *
 * Requires a running PostgreSQL + Redis (use `docker compose up -d`).
 * Run with: npx jest --config test/jest-e2e.json test/ai.e2e-spec.ts
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiService } from '../src/ai/ai.service';
import { RedisService } from '../src/redis/redis.service';

// Disable throttling for E2E tests
jest.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

describe('AI E2E (BT.7)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiService: AiService;
  let redisService: RedisService;

  let userToken: string;
  let userId: string;
  let dialogueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    aiService = app.get(AiService);
    redisService = app.get(RedisService);

    // Mock AI calls to avoid real API requests
    jest.spyOn(aiService, 'socraticChat').mockResolvedValue(
      'Отличный вопрос! Давай разберём это вместе. Что ты уже знаешь о теории игр?',
    );

    // Register user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-ai-${Date.now()}@test.com`,
        password: 'AiTest123!',
        name: 'E2E AI User',
      })
      .expect(201);

    userToken = userRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(userToken.split('.')[1], 'base64').toString(),
    );
    userId = payload.sub;

    // Clear any Redis AI limits for this user
    const today = new Date().toISOString().slice(0, 10);
    await redisService.del(`ai:dialogue:limit:${userId}:${today}`).catch(() => {});
  });

  afterAll(async () => {
    await prisma.aiDialogue
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.aiTokenUsage
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.userStats
      .deleteMany({ where: { userId } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { email: { startsWith: 'e2e-ai-' } } })
      .catch(() => {});
    await app.close();
  });

  // ══════════════════════════════════════════════
  // 1. CREATE DIALOGUE
  // ══════════════════════════════════════════════

  describe('Create dialogue', () => {
    it('POST /ai/dialogue — should create a new dialogue', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/dialogue')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ topic: 'Теория игр', message: 'Что такое дилемма заключённого?' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('topic', 'Теория игр');
      expect(res.body).toHaveProperty('messages');
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages[0].role).toBe('user');
      expect(res.body.messages[1].role).toBe('assistant');
      expect(res.body).toHaveProperty('createdAt');

      dialogueId = res.body.id;
    });

    it('POST /ai/dialogue — should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/ai/dialogue')
        .send({ topic: 'Test', message: 'Hello' })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 2. GET DIALOGUE BY ID
  // ══════════════════════════════════════════════

  describe('Get dialogue', () => {
    it('GET /ai/dialogue/:id — should return dialogue with messages', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai/dialogue/${dialogueId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(dialogueId);
      expect(res.body.topic).toBe('Теория игр');
      expect(res.body.messages.length).toBe(2);
      expect(res.body).toHaveProperty('exchangesUsed');
      expect(res.body).toHaveProperty('exchangesLeft');
      expect(res.body.exchangesUsed).toBe(1);
      expect(res.body.exchangesLeft).toBe(9); // 10 max - 1 used
      expect(res.body).toHaveProperty('tokenCount');
      expect(res.body).toHaveProperty('createdAt');
    });

    it('GET /ai/dialogue/:id — should 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/ai/dialogue/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('GET /ai/dialogue/:id — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get(`/ai/dialogue/${dialogueId}`)
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 3. SEND MESSAGE (continue dialogue)
  // ══════════════════════════════════════════════

  describe('Send message', () => {
    it('POST /ai/dialogue/:id/message — should continue dialogue', async () => {
      const res = await request(app.getHttpServer())
        .post(`/ai/dialogue/${dialogueId}/message`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Расскажи подробнее о стратегиях' })
        .expect(201);

      expect(res.body.id).toBe(dialogueId);
      expect(res.body.messages.length).toBe(4); // 2 original + 2 new
      expect(res.body).toHaveProperty('exchangesUsed', 2);
      expect(res.body).toHaveProperty('exchangesLeft', 8);
    });

    it('POST /ai/dialogue/:id/message — should reject for non-existent dialogue', async () => {
      await request(app.getHttpServer())
        .post('/ai/dialogue/00000000-0000-0000-0000-000000000000/message')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Test' })
        .expect(404);
    });

    it('POST /ai/dialogue/:id/message — should reject without auth', async () => {
      await request(app.getHttpServer())
        .post(`/ai/dialogue/${dialogueId}/message`)
        .send({ message: 'Test' })
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 4. DIALOGUE OWNERSHIP (access control)
  // ══════════════════════════════════════════════

  describe('Dialogue ownership', () => {
    let otherUserToken: string;

    beforeAll(async () => {
      const otherRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `e2e-ai-other-${Date.now()}@test.com`,
          password: 'Other123!',
          name: 'E2E AI Other',
        })
        .expect(201);

      otherUserToken = otherRes.body.accessToken;
    });

    it('GET /ai/dialogue/:id — should reject access from another user', async () => {
      await request(app.getHttpServer())
        .get(`/ai/dialogue/${dialogueId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('POST /ai/dialogue/:id/message — should reject from another user', async () => {
      await request(app.getHttpServer())
        .post(`/ai/dialogue/${dialogueId}/message`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ message: 'Hijack attempt' })
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════
  // 5. LIST DIALOGUES
  // ══════════════════════════════════════════════

  describe('List dialogues', () => {
    it('GET /ai/dialogues — should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/dialogues')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const dialogue = res.body.data.find((d: any) => d.id === dialogueId);
      expect(dialogue).toBeDefined();
      expect(dialogue.topic).toBe('Теория игр');
      expect(dialogue).toHaveProperty('messageCount');
      expect(dialogue).toHaveProperty('tokenCount');
      expect(dialogue).toHaveProperty('createdAt');

      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('GET /ai/dialogues — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/ai/dialogues')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 6. DAILY QUOTA
  // ══════════════════════════════════════════════

  describe('Daily quota', () => {
    it('GET /ai/quota — should return quota status', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/quota')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('used');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('remaining');
      expect(res.body).toHaveProperty('exceeded');
      expect(typeof res.body.used).toBe('number');
      expect(typeof res.body.limit).toBe('number');
      expect(res.body.limit).toBe(50000); // DAILY_TOKEN_LIMIT
      expect(res.body.exceeded).toBe(false);
    });

    it('GET /ai/quota — should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/ai/quota')
        .expect(401);
    });
  });

  // ══════════════════════════════════════════════
  // 7. DAILY DIALOGUE LIMIT
  // ══════════════════════════════════════════════

  describe('Daily dialogue limit', () => {
    it('Should enforce daily dialogue limit (5)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const limitKey = `ai:dialogue:limit:${userId}:${today}`;

      // Set counter to 5 (limit reached)
      await redisService.set(limitKey, '5', 86400);

      const res = await request(app.getHttpServer())
        .post('/ai/dialogue')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ topic: 'Limit test', message: 'Should be blocked' })
        .expect(403);

      expect(res.body.message).toContain('лимит');

      // Reset for other tests
      await redisService.del(limitKey);
    });
  });

  // ══════════════════════════════════════════════
  // 8. MAX EXCHANGES PER DIALOGUE (10)
  // ══════════════════════════════════════════════

  describe('Max exchanges', () => {
    it('Should enforce max 10 exchanges per dialogue', async () => {
      // Create a dialogue with 10 user messages already
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push({ role: 'user', content: `Message ${i + 1}` });
        messages.push({ role: 'assistant', content: `Reply ${i + 1}` });
      }

      const dialogue = await prisma.aiDialogue.create({
        data: {
          userId,
          topic: 'Max exchange test',
          messages: messages,
          tokenCount: 0,
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/ai/dialogue/${dialogue.id}/message`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'This should be rejected' })
        .expect(409);

      expect(res.body.message).toContain('лимит');
    });
  });

  // ══════════════════════════════════════════════
  // 9. SERVICE-LEVEL: checkDailyQuota
  // ══════════════════════════════════════════════

  describe('Service: checkDailyQuota', () => {
    it('should return quota with zero usage for fresh user', async () => {
      const quota = await aiService.checkDailyQuota(userId);
      expect(quota).toHaveProperty('used');
      expect(quota).toHaveProperty('limit', 50000);
      expect(quota).toHaveProperty('remaining');
      expect(quota).toHaveProperty('exceeded');
      expect(quota.exceeded).toBe(false);
    });
  });

  // ══════════════════════════════════════════════
  // 10. MULTIPLE DIALOGUES
  // ══════════════════════════════════════════════

  describe('Multiple dialogues', () => {
    it('Should create second dialogue on different topic', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai/dialogue')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ topic: 'Когнитивные искажения', message: 'Что такое confirmation bias?' })
        .expect(201);

      expect(res.body.topic).toBe('Когнитивные искажения');
      expect(res.body.id).not.toBe(dialogueId);
    });

    it('Dialogue list should show both dialogues', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai/dialogues')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // At least 2 dialogues (plus the max-exchange test one)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});
