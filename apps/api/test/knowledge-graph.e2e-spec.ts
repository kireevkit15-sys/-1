/**
 * Knowledge Graph E2E Tests (L25.1)
 *
 * Integration tests for the concept graph: creation of concepts and relations,
 * filtering / search, traversal by PREREQUISITE chain, mastery map, isolation
 * between users.
 *
 * Builds a small isolated subgraph (slug prefix `kg-e2e-`) so the tests do not
 * depend on the seeded content and do not pollute it.
 *
 *   A ──PREREQUISITE──▶ B ──PREREQUISITE──▶ C
 *   │                   │
 *   │                   └──DEEPENS──▶ C
 *   └──RELATED──▶ D (LOGIC)
 *
 * Run: node --stack-size=65536 test/run-e2e.js knowledge-graph.e2e-spec
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

describe('Knowledge Graph (e2e) — L25.1', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const slugPrefix = `kg-e2e-${Date.now()}-`;
  const slugA = `${slugPrefix}a-strategy-root`;
  const slugB = `${slugPrefix}b-strategy-mid`;
  const slugC = `${slugPrefix}c-strategy-leaf`;
  const slugD = `${slugPrefix}d-logic-related`;

  const testEmail = `e2e-kg-${Date.now()}@test.com`;
  const otherEmail = `e2e-kg-other-${Date.now()}@test.com`;
  const testPassword = 'TestPass123!';

  let accessToken: string;
  let otherToken: string;
  let userId: string;
  let otherUserId: string;

  let conceptAId: string;
  let conceptBId: string;
  let conceptCId: string;
  let conceptDId: string;

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
      .send({ email: testEmail, password: testPassword, name: 'KG Test User' })
      .expect(201);
    accessToken = reg.body.accessToken;
    userId = (jwtService.decode(accessToken) as { sub: string }).sub;

    const reg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: otherEmail, password: testPassword, name: 'KG Other User' })
      .expect(201);
    otherToken = reg2.body.accessToken;
    otherUserId = (jwtService.decode(otherToken) as { sub: string }).sub;

    const a = await prisma.concept.create({
      data: {
        slug: slugA,
        nameRu: 'Стратегическое мышление (test)',
        description: 'Корневой концепт цепочки PREREQUISITE для интеграционного теста графа.',
        branch: 'STRATEGY',
        category: 'foundation',
        subcategory: 'thinking',
        bloomLevel: 1,
        difficulty: 'BRONZE',
        sourceFile: 'test/knowledge-graph.e2e-spec.ts',
      },
    });
    conceptAId = a.id;

    const b = await prisma.concept.create({
      data: {
        slug: slugB,
        nameRu: 'OODA-петля (test)',
        description: 'Промежуточный концепт, требует A.',
        branch: 'STRATEGY',
        category: 'frameworks',
        bloomLevel: 2,
        difficulty: 'SILVER',
      },
    });
    conceptBId = b.id;

    const c = await prisma.concept.create({
      data: {
        slug: slugC,
        nameRu: 'Стратегия Lean Startup (test)',
        description: 'Листовой концепт, требует B.',
        branch: 'STRATEGY',
        category: 'frameworks',
        bloomLevel: 3,
        difficulty: 'GOLD',
      },
    });
    conceptCId = c.id;

    const d = await prisma.concept.create({
      data: {
        slug: slugD,
        nameRu: 'Дедукция (test)',
        description: 'Связанный концепт из ветки LOGIC.',
        branch: 'LOGIC',
        category: 'reasoning',
        bloomLevel: 2,
        difficulty: 'BRONZE',
      },
    });
    conceptDId = d.id;

    await prisma.conceptRelation.createMany({
      data: [
        { sourceId: conceptAId, targetId: conceptBId, relationType: 'PREREQUISITE', strength: 1.0 },
        { sourceId: conceptBId, targetId: conceptCId, relationType: 'PREREQUISITE', strength: 0.9 },
        { sourceId: conceptBId, targetId: conceptCId, relationType: 'DEEPENS', strength: 0.7 },
        { sourceId: conceptAId, targetId: conceptDId, relationType: 'RELATED', strength: 0.5 },
      ],
    });

    await prisma.depthLayer.create({
      data: {
        conceptId: conceptBId,
        layerType: 'SCIENCE',
        content: { summary: 'OODA-loop in cognitive science (test fixture).' },
        sourceRef: 'Boyd, J. (1976) — test fixture',
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.depthLayer.deleteMany({ where: { conceptId: { in: [conceptAId, conceptBId, conceptCId, conceptDId] } } }).catch(() => {});
    await prisma.userConceptMastery.deleteMany({ where: { conceptId: { in: [conceptAId, conceptBId, conceptCId, conceptDId] } } }).catch(() => {});
    await prisma.conceptRelation.deleteMany({ where: { OR: [
      { sourceId: { in: [conceptAId, conceptBId, conceptCId, conceptDId] } },
      { targetId: { in: [conceptAId, conceptBId, conceptCId, conceptDId] } },
    ] } }).catch(() => {});
    await prisma.concept.deleteMany({ where: { slug: { startsWith: slugPrefix } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: [testEmail, otherEmail] } } }).catch(() => {});
    await app.close();
  }, 15000);

  // ──────────────────────────────────────────────────────────────────────
  // Concept creation & schema integrity
  // ──────────────────────────────────────────────────────────────────────

  describe('Concept & relation creation', () => {
    it('persists concepts with all required fields', async () => {
      const a = await prisma.concept.findUnique({ where: { id: conceptAId } });
      expect(a).not.toBeNull();
      expect(a!.slug).toBe(slugA);
      expect(a!.branch).toBe('STRATEGY');
      expect(a!.bloomLevel).toBe(1);
      expect(a!.difficulty).toBe('BRONZE');
    });

    it('enforces unique constraint on (sourceId, targetId, relationType)', async () => {
      await expect(
        prisma.conceptRelation.create({
          data: { sourceId: conceptAId, targetId: conceptBId, relationType: 'PREREQUISITE' },
        }),
      ).rejects.toThrow();
    });

    it('allows the same pair under a different relationType', async () => {
      const extra = await prisma.conceptRelation.create({
        data: { sourceId: conceptAId, targetId: conceptBId, relationType: 'RELATED', strength: 0.3 },
      });
      expect(extra.id).toBeDefined();
      await prisma.conceptRelation.delete({ where: { id: extra.id } });
    });

    it('cascades relation deletion when a concept is removed', async () => {
      const tmp = await prisma.concept.create({
        data: {
          slug: `${slugPrefix}tmp-cascade`,
          nameRu: 'Cascade test',
          description: 'will be deleted',
          branch: 'STRATEGY',
          category: 'tmp',
        },
      });
      const rel = await prisma.conceptRelation.create({
        data: { sourceId: conceptAId, targetId: tmp.id, relationType: 'RELATED' },
      });

      await prisma.concept.delete({ where: { id: tmp.id } });

      const after = await prisma.conceptRelation.findUnique({ where: { id: rel.id } });
      expect(after).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /concepts — filters & search (B23.1)
  // ──────────────────────────────────────────────────────────────────────

  describe('GET /concepts', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer()).get('/concepts').expect(401);
    });

    it('filters by branch', async () => {
      const res = await request(app.getHttpServer())
        .get('/concepts')
        .query({ branch: 'STRATEGY', search: slugPrefix, limit: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const slugs = res.body.items.map((i: { slug: string }) => i.slug);
      expect(slugs).toEqual(expect.arrayContaining([slugA, slugB, slugC]));
      expect(slugs).not.toContain(slugD);
    });

    it('filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/concepts')
        .query({ category: 'frameworks', search: slugPrefix, limit: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const slugs = res.body.items.map((i: { slug: string }) => i.slug);
      expect(slugs).toEqual(expect.arrayContaining([slugB, slugC]));
      expect(slugs).not.toContain(slugA);
    });

    it('filters by difficulty', async () => {
      const res = await request(app.getHttpServer())
        .get('/concepts')
        .query({ difficulty: 'GOLD', search: slugPrefix, limit: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const slugs = res.body.items.map((i: { slug: string }) => i.slug);
      expect(slugs).toContain(slugC);
      expect(slugs).not.toContain(slugA);
      expect(slugs).not.toContain(slugB);
    });

    it('search by slug prefix returns only test fixtures', async () => {
      const res = await request(app.getHttpServer())
        .get('/concepts')
        .query({ search: slugPrefix, limit: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(4);
      expect(res.body.total).toBe(4);
    });

    it('respects limit and offset (pagination)', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/concepts')
        .query({ search: slugPrefix, limit: 2, offset: 0 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/concepts')
        .query({ search: slugPrefix, limit: 2, offset: 2 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(page1.body.items.length).toBe(2);
      expect(page2.body.items.length).toBe(2);
      const ids1 = page1.body.items.map((i: { id: string }) => i.id);
      const ids2 = page2.body.items.map((i: { id: string }) => i.id);
      expect(ids1).not.toEqual(expect.arrayContaining(ids2));
    });

    it('returns mastery=0 for new user with no progress', async () => {
      const res = await request(app.getHttpServer())
        .get('/concepts')
        .query({ search: slugPrefix, limit: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      for (const item of res.body.items) {
        expect(item.mastery).toBe(0);
        expect(item.bloomReached).toBe(0);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /concepts/:id — full details (B23.2)
  // ──────────────────────────────────────────────────────────────────────

  describe('GET /concepts/:id', () => {
    it('returns full details including relations and depth layers', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptBId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(conceptBId);
      expect(res.body.slug).toBe(slugB);
      expect(res.body.branch).toBe('STRATEGY');
      expect(res.body.category).toBe('frameworks');

      const outgoingTypes = res.body.relations.from.map((r: { type: string }) => r.type);
      expect(outgoingTypes).toEqual(expect.arrayContaining(['PREREQUISITE', 'DEEPENS']));

      const incomingTypes = res.body.relations.to.map((r: { type: string }) => r.type);
      expect(incomingTypes).toContain('PREREQUISITE');

      expect(res.body.depthLayers).toHaveLength(1);
      expect(res.body.depthLayers[0].type).toBe('SCIENCE');
    });

    it('returns 404 for unknown UUID', async () => {
      await request(app.getHttpServer())
        .get('/concepts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/concepts/not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /concepts/:id/related (B23.3) — directional, with relation types
  // ──────────────────────────────────────────────────────────────────────

  describe('GET /concepts/:id/related', () => {
    it('returns outgoing relations from A (to B and D)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptAId}/related`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const outgoing = res.body.related.filter((r: { direction: string }) => r.direction === 'outgoing');
      const targetIds = outgoing.map((r: { concept: { id: string } }) => r.concept.id);
      expect(targetIds).toEqual(expect.arrayContaining([conceptBId, conceptDId]));

      const incoming = res.body.related.filter((r: { direction: string }) => r.direction === 'incoming');
      expect(incoming).toHaveLength(0);
    });

    it('returns both incoming and outgoing for B (middle of chain)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptBId}/related`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const incoming = res.body.related.filter((r: { direction: string }) => r.direction === 'incoming');
      const outgoing = res.body.related.filter((r: { direction: string }) => r.direction === 'outgoing');

      expect(incoming.map((r: { concept: { id: string } }) => r.concept.id)).toContain(conceptAId);
      expect(outgoing.map((r: { concept: { id: string } }) => r.concept.id)).toContain(conceptCId);
    });

    it('exposes relationType and strength on each edge', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptAId}/related`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const toB = res.body.related.find(
        (r: { direction: string; concept: { id: string } }) =>
          r.direction === 'outgoing' && r.concept.id === conceptBId,
      );
      expect(toB).toBeDefined();
      expect(toB.relationType).toBe('PREREQUISITE');
      expect(toB.strength).toBe(1);
    });

    it('returns 404 for unknown concept', async () => {
      await request(app.getHttpServer())
        .get('/concepts/00000000-0000-0000-0000-000000000000/related')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Prerequisite traversal — walking the PREREQUISITE chain
  // ──────────────────────────────────────────────────────────────────────

  describe('Prerequisite traversal', () => {
    it('walks A → B → C via PREREQUISITE outgoing edges', async () => {
      const visited: string[] = [conceptAId];
      let current = conceptAId;

      for (let step = 0; step < 5 && current; step++) {
        const res = await request(app.getHttpServer())
          .get(`/concepts/${current}/related`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const next = res.body.related.find(
          (r: { direction: string; relationType: string }) =>
            r.direction === 'outgoing' && r.relationType === 'PREREQUISITE',
        );
        if (!next) break;
        visited.push(next.concept.id);
        current = next.concept.id;
      }

      expect(visited).toEqual([conceptAId, conceptBId, conceptCId]);
    });

    it('finds all prerequisites of C by walking incoming PREREQUISITE edges', async () => {
      const ancestors = new Set<string>();
      const queue: string[] = [conceptCId];

      while (queue.length > 0) {
        const id = queue.shift()!;
        const res = await request(app.getHttpServer())
          .get(`/concepts/${id}/related`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        for (const edge of res.body.related) {
          if (edge.direction === 'incoming' && edge.relationType === 'PREREQUISITE') {
            if (!ancestors.has(edge.concept.id)) {
              ancestors.add(edge.concept.id);
              queue.push(edge.concept.id);
            }
          }
        }
      }

      expect(Array.from(ancestors).sort()).toEqual([conceptAId, conceptBId].sort());
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /learning/mastery — knowledge map (B23.4)
  // ──────────────────────────────────────────────────────────────────────

  describe('GET /learning/mastery', () => {
    it('returns branchStats and includes test concepts', async () => {
      const res = await request(app.getHttpServer())
        .get('/learning/mastery')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalConcepts');
      expect(res.body).toHaveProperty('branchStats');
      expect(res.body.branchStats).toHaveProperty('STRATEGY');

      const slugs = res.body.concepts.map((c: { slug: string }) => c.slug);
      expect(slugs).toEqual(expect.arrayContaining([slugA, slugB, slugC, slugD]));
    });

    it('reflects user mastery after recording progress', async () => {
      await prisma.userConceptMastery.upsert({
        where: { userId_conceptId: { userId, conceptId: conceptAId } },
        create: { userId, conceptId: conceptAId, mastery: 0.85, bloomReached: 3 },
        update: { mastery: 0.85, bloomReached: 3 },
      });

      const res = await request(app.getHttpServer())
        .get('/learning/mastery')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const a = res.body.concepts.find((c: { slug: string }) => c.slug === slugA);
      expect(a).toBeDefined();
      expect(a.mastery).toBeCloseTo(0.85, 5);
      expect(a.bloomReached).toBe(3);
      expect(res.body.masteredCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cross-user isolation — mastery is per-user
  // ──────────────────────────────────────────────────────────────────────

  describe('Cross-user isolation', () => {
    it('mastery written for user A is not visible to user B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptAId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(res.body.mastery).toBeNull();
    });

    it('related endpoint reports mastery=0 for the other user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/concepts/${conceptBId}/related`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      for (const edge of res.body.related) {
        expect(edge.concept.mastery).toBe(0);
      }
    });

    it('keeps both user ids alive (no accidental data deletion)', async () => {
      const both = await prisma.user.findMany({
        where: { id: { in: [userId, otherUserId] } },
        select: { id: true },
      });
      expect(both).toHaveLength(2);
    });
  });
});
