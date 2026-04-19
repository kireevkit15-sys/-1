/**
 * Learning ↔ Battles Integration Tests (L25.5)
 *
 * Verifies the linkage between mastered concepts and battle questions:
 *   - mastery >= 0.3 unlocks every active Question linked to that concept
 *   - mastery < 0.3 keeps the question locked
 *   - inactive (isActive=false) questions stay hidden even if mastered
 *   - duplicates from a question linked to multiple mastered concepts are deduped
 *   - filterBattleQuestions returns the intersection between two players,
 *     or falls back to all active branch questions when intersection too small
 *   - canParticipate enforces level → difficulty rules from the LearningPath
 *   - getMaxBattleRank maps each LevelName to its max difficulty
 *   - getBattleUnlockInfo reports new question count + branches + display name
 *   - getAvailableQuestionsByBranch groups by branch
 *
 * Builds an isolated subgraph (slug prefix `lb-e2e-`, question text prefix
 * `lb-e2e-`) so it does not depend on or pollute seeded content.
 *
 * Run: node --stack-size=65536 test/run-e2e.js learning-battles.e2e-spec
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
import { BattleLinkService } from '../src/learning/battle-link.service';

describe('Learning ↔ Battles Integration (e2e) — L25.5', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let battleLink: BattleLinkService;

  const ts = Date.now();
  const slugPrefix = `lb-e2e-${ts}-`;
  const textPrefix = `lb-e2e-${ts}-`;
  const password = 'TestPass123!';

  // Subgraph: cA (STRATEGY), cB (LOGIC). Each has 2 active questions; cA also has 1 inactive.
  // qShared is linked to BOTH cA and cB (dedup test).
  let cAId: string;
  let cBId: string;
  let qA1Id: string;
  let qA2Id: string;
  let qAInactiveId: string;
  let qB1Id: string;
  let qB2Id: string;
  let qSharedId: string;

  // Users
  const emailMastered = `e2e-lb-mastered-${ts}@test.com`;
  const emailEmpty = `e2e-lb-empty-${ts}@test.com`;
  const emailNoPath = `e2e-lb-nopath-${ts}@test.com`;
  const emailAwakened = `e2e-lb-awakened-${ts}@test.com`;
  const emailObserver = `e2e-lb-observer-${ts}@test.com`;
  const emailMaster = `e2e-lb-master-${ts}@test.com`;
  const emailPartner = `e2e-lb-partner-${ts}@test.com`;

  let masteredUserId: string;
  let emptyUserId: string;
  let noPathUserId: string;
  let awakenedUserId: string;
  let observerUserId: string;
  let masterUserId: string;
  let partnerUserId: string;

  const allEmails = [
    emailMastered,
    emailEmpty,
    emailNoPath,
    emailAwakened,
    emailObserver,
    emailMaster,
    emailPartner,
  ];

  const registerUser = async (email: string): Promise<string> => {
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'BattleLink Test' })
      .expect(201);
    return (jwtService.decode(reg.body.accessToken) as { sub: string }).sub;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    battleLink = app.get(BattleLinkService);

    // ── Concepts ──
    const cA = await prisma.concept.create({
      data: {
        slug: `${slugPrefix}strategy`,
        nameRu: 'Стратегическая концепция (test)',
        description: 'STRATEGY concept for battle-link integration test.',
        branch: 'STRATEGY',
        category: 'foundation',
        bloomLevel: 1,
        difficulty: 'BRONZE',
      },
    });
    cAId = cA.id;

    const cB = await prisma.concept.create({
      data: {
        slug: `${slugPrefix}logic`,
        nameRu: 'Логическая концепция (test)',
        description: 'LOGIC concept for battle-link integration test.',
        branch: 'LOGIC',
        category: 'reasoning',
        bloomLevel: 1,
        difficulty: 'BRONZE',
      },
    });
    cBId = cB.id;

    // ── Questions ──
    const mkQuestion = async (suffix: string, branch: 'STRATEGY' | 'LOGIC', isActive = true) =>
      prisma.question.create({
        data: {
          category: 'integration-test',
          branch,
          difficulty: 'BRONZE',
          text: `${textPrefix}${suffix}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          explanation: 'integration test fixture',
          statPrimary: 'logic',
          isActive,
        },
      });

    const qA1 = await mkQuestion('qA1', 'STRATEGY');
    const qA2 = await mkQuestion('qA2', 'STRATEGY');
    const qAInactive = await mkQuestion('qA-inactive', 'STRATEGY', false);
    const qB1 = await mkQuestion('qB1', 'LOGIC');
    const qB2 = await mkQuestion('qB2', 'LOGIC');
    const qShared = await mkQuestion('qShared', 'STRATEGY');
    qA1Id = qA1.id;
    qA2Id = qA2.id;
    qAInactiveId = qAInactive.id;
    qB1Id = qB1.id;
    qB2Id = qB2.id;
    qSharedId = qShared.id;

    // ── ConceptQuestion links ──
    await prisma.conceptQuestion.createMany({
      data: [
        { conceptId: cAId, questionId: qA1Id },
        { conceptId: cAId, questionId: qA2Id },
        { conceptId: cAId, questionId: qAInactiveId },
        { conceptId: cAId, questionId: qSharedId },
        { conceptId: cBId, questionId: qB1Id },
        { conceptId: cBId, questionId: qB2Id },
        { conceptId: cBId, questionId: qSharedId },
      ],
    });

    // ── Users ──
    masteredUserId = await registerUser(emailMastered);
    emptyUserId = await registerUser(emailEmpty);
    noPathUserId = await registerUser(emailNoPath);
    awakenedUserId = await registerUser(emailAwakened);
    observerUserId = await registerUser(emailObserver);
    masterUserId = await registerUser(emailMaster);
    partnerUserId = await registerUser(emailPartner);

    // ── Mastery setup ──
    // masteredUser: cA mastery=0.5 (unlocked), cB mastery=0.29 (locked — below threshold)
    await prisma.userConceptMastery.create({
      data: { userId: masteredUserId, conceptId: cAId, mastery: 0.5 },
    });
    await prisma.userConceptMastery.create({
      data: { userId: masteredUserId, conceptId: cBId, mastery: 0.29 },
    });

    // emptyUser: no mastery rows → expect []
    // partnerUser: cA mastery=0.4 (intersection candidate)
    await prisma.userConceptMastery.create({
      data: { userId: partnerUserId, conceptId: cAId, mastery: 0.4 },
    });

    // ── LearningPath setup for level-gating ──
    // noPathUser: intentionally has no LearningPath
    await prisma.learningPath.create({
      data: { userId: emptyUserId, currentLevel: 'SLEEPING', currentDay: 1 },
    });
    await prisma.learningPath.create({
      data: { userId: masteredUserId, currentLevel: 'SLEEPING', currentDay: 1 },
    });
    await prisma.learningPath.create({
      data: { userId: partnerUserId, currentLevel: 'SLEEPING', currentDay: 1 },
    });
    await prisma.learningPath.create({
      data: { userId: awakenedUserId, currentLevel: 'AWAKENED', currentDay: 1 },
    });
    await prisma.learningPath.create({
      data: { userId: observerUserId, currentLevel: 'OBSERVER', currentDay: 1 },
    });
    await prisma.learningPath.create({
      data: { userId: masterUserId, currentLevel: 'MASTER', currentDay: 1 },
    });
  }, 60000);

  afterAll(async () => {
    const conceptIds = [cAId, cBId];
    const questionIds = [qA1Id, qA2Id, qAInactiveId, qB1Id, qB2Id, qSharedId];
    const userIds = [
      masteredUserId,
      emptyUserId,
      noPathUserId,
      awakenedUserId,
      observerUserId,
      masterUserId,
      partnerUserId,
    ];

    await prisma.conceptQuestion.deleteMany({
      where: { OR: [{ conceptId: { in: conceptIds } }, { questionId: { in: questionIds } }] },
    }).catch(() => {});
    await prisma.userConceptMastery.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { conceptId: { in: conceptIds } }] },
    }).catch(() => {});
    await prisma.learningPath.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } }).catch(() => {});
    await prisma.concept.deleteMany({ where: { id: { in: conceptIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: allEmails } } }).catch(() => {});
    await app.close();
  }, 30000);

  // ──────────────────────────────────────────────────────────────────────
  // getUnlockedQuestions — mastery threshold + active filter + dedup
  // ──────────────────────────────────────────────────────────────────────

  describe('getUnlockedQuestions', () => {
    it('returns [] when user has no mastery rows', async () => {
      const ids = await battleLink.getUnlockedQuestions(emptyUserId);
      expect(ids).toEqual([]);
    });

    it('returns active questions linked to mastered concept (mastery=0.5 on cA)', async () => {
      const ids = await battleLink.getUnlockedQuestions(masteredUserId);
      // cA links: qA1 (active), qA2 (active), qAInactive (filtered out), qShared (active)
      expect(ids).toContain(qA1Id);
      expect(ids).toContain(qA2Id);
      expect(ids).toContain(qSharedId);
    });

    it('filters out inactive questions even when concept is mastered', async () => {
      const ids = await battleLink.getUnlockedQuestions(masteredUserId);
      expect(ids).not.toContain(qAInactiveId);
    });

    it('does not unlock questions from concepts below threshold (mastery=0.29 on cB)', async () => {
      const ids = await battleLink.getUnlockedQuestions(masteredUserId);
      expect(ids).not.toContain(qB1Id);
      expect(ids).not.toContain(qB2Id);
    });

    it('deduplicates a question linked to multiple mastered concepts', async () => {
      // Bump cB mastery to unlock; qShared is on both cA and cB → must appear exactly once.
      await prisma.userConceptMastery.update({
        where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
        data: { mastery: 0.5 },
      });
      try {
        const ids = await battleLink.getUnlockedQuestions(masteredUserId);
        const sharedCount = ids.filter((id) => id === qSharedId).length;
        expect(sharedCount).toBe(1);
        expect(ids).toContain(qB1Id);
        expect(ids).toContain(qB2Id);
      } finally {
        // restore for downstream tests
        await prisma.userConceptMastery.update({
          where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
          data: { mastery: 0.29 },
        });
      }
    });

    it('respects the threshold boundary at exactly mastery=0.3', async () => {
      await prisma.userConceptMastery.update({
        where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
        data: { mastery: 0.3 },
      });
      try {
        const ids = await battleLink.getUnlockedQuestions(masteredUserId);
        expect(ids).toContain(qB1Id);
      } finally {
        await prisma.userConceptMastery.update({
          where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
          data: { mastery: 0.29 },
        });
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // filterBattleQuestions — intersection + branch filter + fallback
  // ──────────────────────────────────────────────────────────────────────

  describe('filterBattleQuestions', () => {
    it('returns intersection of two players within the requested branch', async () => {
      // masteredUser: unlocked qA1, qA2, qShared (all STRATEGY)
      // partnerUser:  unlocked qA1, qA2, qShared (all STRATEGY) via cA mastery=0.4
      const ids = await battleLink.filterBattleQuestions(
        masteredUserId,
        partnerUserId,
        'STRATEGY',
        2,
      );
      expect(ids).toHaveLength(2);
      const allowed = new Set([qA1Id, qA2Id, qSharedId]);
      for (const id of ids) {
        expect(allowed.has(id)).toBe(true);
      }
    });

    it('falls back to all active branch questions when intersection is empty', async () => {
      // emptyUser has no mastery → intersection with anyone = []
      const ids = await battleLink.filterBattleQuestions(
        emptyUserId,
        masteredUserId,
        'LOGIC',
        2,
      );
      // Fallback returns active LOGIC questions; our isolated set has qB1, qB2 (active)
      // — but DB also has seeded LOGIC questions. We just assert size+activeness.
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.length).toBeLessThanOrEqual(2);
      const rows = await prisma.question.findMany({
        where: { id: { in: ids } },
        select: { branch: true, isActive: true },
      });
      for (const r of rows) {
        expect(r.branch).toBe('LOGIC');
        expect(r.isActive).toBe(true);
      }
    });

    it('falls back to active branch questions when intersection size < count', async () => {
      // Intersection in STRATEGY = 3 ({qA1,qA2,qShared}); request count=10 → triggers fallback.
      const ids = await battleLink.filterBattleQuestions(
        masteredUserId,
        partnerUserId,
        'STRATEGY',
        10,
      );
      // Fallback returns up to 10 active STRATEGY questions; our inactive qAInactive
      // must NOT appear in the result.
      expect(ids).not.toContain(qAInactiveId);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getMaxBattleRank — pure mapping
  // ──────────────────────────────────────────────────────────────────────

  describe('getMaxBattleRank', () => {
    it('SLEEPING → BRONZE', () => {
      expect(battleLink.getMaxBattleRank('SLEEPING')).toBe('BRONZE');
    });
    it('AWAKENED → SILVER', () => {
      expect(battleLink.getMaxBattleRank('AWAKENED')).toBe('SILVER');
    });
    it('OBSERVER / WARRIOR / STRATEGIST / MASTER → GOLD', () => {
      expect(battleLink.getMaxBattleRank('OBSERVER')).toBe('GOLD');
      expect(battleLink.getMaxBattleRank('WARRIOR')).toBe('GOLD');
      expect(battleLink.getMaxBattleRank('STRATEGIST')).toBe('GOLD');
      expect(battleLink.getMaxBattleRank('MASTER')).toBe('GOLD');
    });
    it('unknown level → BRONZE (safe default)', () => {
      expect(battleLink.getMaxBattleRank('UNKNOWN')).toBe('BRONZE');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // canParticipate — gates by current LearningPath level
  // ──────────────────────────────────────────────────────────────────────

  describe('canParticipate', () => {
    it('user without LearningPath: BRONZE allowed, SILVER rejected with hint', async () => {
      const bronze = await battleLink.canParticipate(noPathUserId, 'BRONZE');
      expect(bronze.allowed).toBe(true);

      const silver = await battleLink.canParticipate(noPathUserId, 'SILVER');
      expect(silver.allowed).toBe(false);
      expect(silver.reason).toMatch(/Начни путь обучения/);
    });

    it('SLEEPING level: only BRONZE allowed', async () => {
      const bronze = await battleLink.canParticipate(emptyUserId, 'BRONZE');
      const silver = await battleLink.canParticipate(emptyUserId, 'SILVER');
      const gold = await battleLink.canParticipate(emptyUserId, 'GOLD');
      expect(bronze.allowed).toBe(true);
      expect(silver.allowed).toBe(false);
      expect(gold.allowed).toBe(false);
      expect(silver.reason).toMatch(/Спящий/);
    });

    it('AWAKENED level: BRONZE + SILVER allowed, GOLD rejected', async () => {
      const bronze = await battleLink.canParticipate(awakenedUserId, 'BRONZE');
      const silver = await battleLink.canParticipate(awakenedUserId, 'SILVER');
      const gold = await battleLink.canParticipate(awakenedUserId, 'GOLD');
      expect(bronze.allowed).toBe(true);
      expect(silver.allowed).toBe(true);
      expect(gold.allowed).toBe(false);
      expect(gold.reason).toMatch(/Пробудившийся/);
    });

    it('OBSERVER level: all three difficulties allowed', async () => {
      for (const diff of ['BRONZE', 'SILVER', 'GOLD']) {
        const r = await battleLink.canParticipate(observerUserId, diff);
        expect(r.allowed).toBe(true);
      }
    });

    it('MASTER level: all three difficulties allowed', async () => {
      for (const diff of ['BRONZE', 'SILVER', 'GOLD']) {
        const r = await battleLink.canParticipate(masterUserId, diff);
        expect(r.allowed).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getBattleUnlockInfo — "В бой" card after barrier
  // ──────────────────────────────────────────────────────────────────────

  describe('getBattleUnlockInfo', () => {
    it('reports new question count + branches + Russian message', async () => {
      // Temporarily promote cB mastery so both branches contribute
      await prisma.userConceptMastery.update({
        where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
        data: { mastery: 0.5 },
      });
      try {
        const info = await battleLink.getBattleUnlockInfo(masteredUserId, 'AWAKENED');
        expect(info.levelCompleted).toBe('Пробудившийся');
        expect(info.message.length).toBeGreaterThan(0);
        expect(info.newBranches).toContain('STRATEGY');
        expect(info.newBranches).toContain('LOGIC');
        // Active unlocked questions: qA1, qA2, qShared (STRATEGY) + qB1, qB2 (LOGIC) = 5+
        expect(info.newQuestionsCount).toBeGreaterThanOrEqual(5);
      } finally {
        await prisma.userConceptMastery.update({
          where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
          data: { mastery: 0.29 },
        });
      }
    });

    it('returns zero counts for user with no mastery, but still gives the level message', async () => {
      const info = await battleLink.getBattleUnlockInfo(emptyUserId, 'SLEEPING');
      expect(info.levelCompleted).toBe('Спящий');
      expect(info.newQuestionsCount).toBe(0);
      expect(info.newBranches).toEqual([]);
      expect(info.message.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getAvailableQuestionsByBranch — grouping
  // ──────────────────────────────────────────────────────────────────────

  describe('getAvailableQuestionsByBranch', () => {
    it('returns {} when user has no unlocked questions', async () => {
      const map = await battleLink.getAvailableQuestionsByBranch(emptyUserId);
      expect(map).toEqual({});
    });

    it('groups unlocked active questions by branch', async () => {
      await prisma.userConceptMastery.update({
        where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
        data: { mastery: 0.5 },
      });
      try {
        const map = await battleLink.getAvailableQuestionsByBranch(masteredUserId);
        // qA1, qA2, qShared → STRATEGY (3); qB1, qB2 → LOGIC (2)
        expect(map.STRATEGY).toBeGreaterThanOrEqual(3);
        expect(map.LOGIC).toBeGreaterThanOrEqual(2);
      } finally {
        await prisma.userConceptMastery.update({
          where: { userId_conceptId: { userId: masteredUserId, conceptId: cBId } },
          data: { mastery: 0.29 },
        });
      }
    });
  });
});
