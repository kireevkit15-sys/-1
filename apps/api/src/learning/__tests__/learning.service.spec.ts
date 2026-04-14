/**
 * B25.10: PathBuilder — route building for different start zones
 * B25.11: Adaptation — level determination, barrier days, day completion edge cases
 */

import { Test } from '@nestjs/testing';
import { LearningService } from '../learning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('LearningService', () => {
  let service: LearningService;
  let mockPrisma: Record<string, Record<string, jest.Mock>>;
  let mockAi: Record<string, jest.Mock>;

  const userId = 'user-456';

  beforeEach(async () => {
    mockPrisma = {
      learningPath: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      learningDay: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      concept: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      userConceptMastery: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      depthLayer: {},
    };

    mockAi = {
      chatCompletion: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get(LearningService);
  });

  // ══════════════════════════════════════════════
  // B25.10: Path building
  // ══════════════════════════════════════════════

  describe('determine', () => {
    it('should analyze answers and return startZone, painPoint, deliveryStyle', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      const result = await service.determine(userId, {
        answers: [
          { situationIndex: 1, chosenOption: 0 }, // STRATEGY: score 3
          { situationIndex: 2, chosenOption: 3 }, // LOGIC: score 0
          { situationIndex: 3, chosenOption: 1 }, // ERUDITION: score 2
          { situationIndex: 4, chosenOption: 2 }, // RHETORIC: score 1
          { situationIndex: 5, chosenOption: 1 }, // INTUITION: score 2
        ],
      });

      expect(result.startZone).toBe('STRATEGY');
      expect(result.painPoint).toBe('LOGIC');
      expect(result.deliveryStyle).toBeDefined();
    });

    it('should return analytical style when avg option < 1.5', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      const result = await service.determine(userId, {
        answers: [
          { situationIndex: 1, chosenOption: 0 },
          { situationIndex: 2, chosenOption: 1 },
          { situationIndex: 3, chosenOption: 0 },
          { situationIndex: 4, chosenOption: 1 },
          { situationIndex: 5, chosenOption: 0 },
        ],
      });

      expect(result.deliveryStyle).toBe('analytical');
    });

    it('should return practical style when avg option between 1.5 and 2.5', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      const result = await service.determine(userId, {
        answers: [
          { situationIndex: 1, chosenOption: 2 },
          { situationIndex: 2, chosenOption: 2 },
          { situationIndex: 3, chosenOption: 2 },
          { situationIndex: 4, chosenOption: 2 },
          { situationIndex: 5, chosenOption: 2 },
        ],
      });

      expect(result.deliveryStyle).toBe('practical');
    });

    it('should return philosophical style when avg option >= 2.5', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      const result = await service.determine(userId, {
        answers: [
          { situationIndex: 1, chosenOption: 3 },
          { situationIndex: 2, chosenOption: 3 },
          { situationIndex: 3, chosenOption: 3 },
          { situationIndex: 4, chosenOption: 3 },
          { situationIndex: 5, chosenOption: 3 },
        ],
      });

      expect(result.deliveryStyle).toBe('philosophical');
    });

    it('should throw ConflictException if path already exists', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.determine(userId, {
          answers: [
            { situationIndex: 1, chosenOption: 0 },
            { situationIndex: 2, chosenOption: 0 },
            { situationIndex: 3, chosenOption: 0 },
            { situationIndex: 4, chosenOption: 0 },
            { situationIndex: 5, chosenOption: 0 },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('start — path building (B25.10)', () => {
    const makeConcepts = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `c${i}`,
        slug: `concept-${i}`,
        nameRu: `Concept ${i}`,
        description: `Description ${i}`,
        branch: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'][i % 5]!,
        difficulty: i < 5 ? 'BRONZE' : 'SILVER',
        bloomLevel: (i % 6) + 1,
        relationsFrom: [],
      }));

    it('should throw ConflictException if path already exists', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.start(userId)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if no concepts available', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.concept.findMany.mockResolvedValue([]);

      await expect(service.start(userId)).rejects.toThrow(BadRequestException);
    });

    it('should create path with SLEEPING level and day 1', async () => {
      const concepts = makeConcepts(20);
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.learningPath.create.mockResolvedValue({
        id: 'path-new',
        currentLevel: 'SLEEPING',
        currentDay: 1,
      });
      mockPrisma.learningDay.createMany.mockResolvedValue({ count: 20 });

      const result = await service.start(userId, {
        startZone: 'LOGIC',
        painPoint: 'RHETORIC',
        deliveryStyle: 'analytical',
      });

      expect(result.pathId).toBe('path-new');
      expect(result.currentLevel).toBe('SLEEPING');
      expect(result.currentDay).toBe(1);
      expect(result.totalDays).toBe(20);

      // Verify start zone was passed to createMany
      const createCall = mockPrisma.learningPath.create.mock.calls[0][0];
      expect(createCall.data.startZone).toBe('LOGIC');
    });

    it('should prioritize startZone branch in concept ordering', async () => {
      const concepts = makeConcepts(10);
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.learningPath.create.mockResolvedValue({
        id: 'path-new',
        currentLevel: 'SLEEPING',
        currentDay: 1,
      });
      mockPrisma.learningDay.createMany.mockResolvedValue({ count: 10 });

      await service.start(userId, {
        startZone: 'LOGIC',
        painPoint: 'RHETORIC',
        deliveryStyle: 'practical',
      });

      // Verify createMany was called with ordered days
      const createManyCall = mockPrisma.learningDay.createMany.mock.calls[0][0];
      expect(createManyCall.data.length).toBe(10);
      // First day should be a LOGIC concept (startZone prioritized)
      const firstDayConceptId = createManyCall.data[0].conceptId;
      const firstConcept = concepts.find((c) => c.id === firstDayConceptId);
      expect(firstConcept?.branch).toBe('LOGIC');
    });

    it('should cap at 30 days', async () => {
      const concepts = makeConcepts(50);
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.learningPath.create.mockResolvedValue({
        id: 'path-new',
        currentLevel: 'SLEEPING',
        currentDay: 1,
      });
      mockPrisma.learningDay.createMany.mockResolvedValue({ count: 30 });

      const result = await service.start(userId);

      expect(result.totalDays).toBe(30);
    });
  });

  // ══════════════════════════════════════════════
  // B25.11: Adaptation rules
  // ══════════════════════════════════════════════

  describe('completeDay — adaptation (B25.11)', () => {
    it('should throw NotFoundException when path does not exist', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      await expect(service.completeDay(userId, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when day does not exist', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 1 });
      mockPrisma.learningDay.findUnique.mockResolvedValue(null);

      await expect(service.completeDay(userId, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for already completed day', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 1 });
      mockPrisma.learningDay.findUnique.mockResolvedValue({
        id: 'day-1',
        pathId: 'path',
        completedAt: new Date(),
        conceptId: 'c1',
      });

      await expect(service.completeDay(userId, 1)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when trying to skip days', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 1 });
      mockPrisma.learningDay.findUnique.mockResolvedValue({
        id: 'day-5',
        pathId: 'path',
        completedAt: null,
        conceptId: 'c5',
      });

      await expect(service.completeDay(userId, 5)).rejects.toThrow(BadRequestException);
    });

    it('should complete day and advance to next', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 3 });
      mockPrisma.learningDay.findUnique.mockResolvedValue({
        id: 'day-3',
        pathId: 'path',
        completedAt: null,
        conceptId: 'c3',
      });
      mockPrisma.learningDay.update.mockResolvedValue({});
      mockPrisma.userConceptMastery.upsert.mockResolvedValue({});
      mockPrisma.learningPath.update.mockResolvedValue({});

      const result = await service.completeDay(userId, 3);

      expect(result.completedDay).toBe(3);
      expect(result.nextDay).toBe(4);
      expect(typeof result.barrierNeeded).toBe('boolean');
    });

    it('should flag barrier needed on day 5 boundary', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 5 });
      mockPrisma.learningDay.findUnique.mockResolvedValue({
        id: 'day-5',
        pathId: 'path',
        completedAt: null,
        conceptId: 'c5',
      });
      mockPrisma.learningDay.update.mockResolvedValue({});
      mockPrisma.userConceptMastery.upsert.mockResolvedValue({});
      mockPrisma.learningPath.update.mockResolvedValue({});

      const result = await service.completeDay(userId, 5);

      expect(result.nextDay).toBe(6);
      expect(result).toHaveProperty('barrierNeeded');
      expect(result).toHaveProperty('barrierLevel');
    });

    it('should upsert mastery with +0.1 increment', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: 'path', currentDay: 1 });
      mockPrisma.learningDay.findUnique.mockResolvedValue({
        id: 'day-1',
        pathId: 'path',
        completedAt: null,
        conceptId: 'concept-1',
      });
      mockPrisma.learningDay.update.mockResolvedValue({});
      mockPrisma.userConceptMastery.upsert.mockResolvedValue({});
      mockPrisma.learningPath.update.mockResolvedValue({});

      await service.completeDay(userId, 1);

      expect(mockPrisma.userConceptMastery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_conceptId: { userId, conceptId: 'concept-1' } },
          create: expect.objectContaining({ mastery: 0.1 }),
          update: expect.objectContaining({ mastery: { increment: 0.1 } }),
        }),
      );
    });
  });

  describe('getStatus', () => {
    it('should return hasPath=false for user without path', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      const result = await service.getStatus(userId);

      expect(result.hasPath).toBe(false);
    });

    it('should count completed days correctly', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({
        id: 'path',
        currentLevel: 'AWAKENED',
        currentDay: 8,
        startZone: 'LOGIC',
        painPoint: 'RHETORIC',
        deliveryStyle: 'analytical',
        startedAt: new Date(),
        days: [
          { dayNumber: 1, completedAt: new Date() },
          { dayNumber: 2, completedAt: new Date() },
          { dayNumber: 3, completedAt: new Date() },
          { dayNumber: 4, completedAt: new Date() },
          { dayNumber: 5, completedAt: new Date() },
          { dayNumber: 6, completedAt: new Date() },
          { dayNumber: 7, completedAt: new Date() },
          { dayNumber: 8, completedAt: null },
          { dayNumber: 9, completedAt: null },
          { dayNumber: 10, completedAt: null },
        ],
      });

      const result = await service.getStatus(userId);

      expect(result.hasPath).toBe(true);
      expect(result.completedDays).toBe(7);
      expect(result.totalDays).toBe(10);
      expect(result.currentLevel).toBe('AWAKENED');
    });
  });

  describe('gradeExplanation', () => {
    it('should grade explanation and update mastery for "understood"', async () => {
      mockPrisma.concept.findUnique.mockResolvedValue({
        id: 'c1',
        nameRu: 'Test Concept',
        description: 'A description',
      });

      mockAi.chatCompletion.mockResolvedValue(
        JSON.stringify({ grade: 'understood', feedback: 'Perfect', hints: [] }),
      );

      mockPrisma.userConceptMastery.upsert.mockResolvedValue({});

      const result = await service.gradeExplanation(userId, {
        conceptId: 'c1',
        explanation: 'This concept is about how cognitive biases affect decisions.',
      });

      expect(result.grade).toBe('understood');
      expect(result.conceptName).toBe('Test Concept');

      // Should upsert mastery with +0.15 for "understood"
      expect(mockPrisma.userConceptMastery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ mastery: 0.15 }),
        }),
      );
    });

    it('should not update mastery for "missed" grade', async () => {
      mockPrisma.concept.findUnique.mockResolvedValue({
        id: 'c1',
        nameRu: 'Test Concept',
        description: 'A description',
      });

      mockAi.chatCompletion.mockResolvedValue(
        JSON.stringify({ grade: 'missed', feedback: 'Wrong', hints: ['Rethink'] }),
      );

      const result = await service.gradeExplanation(userId, {
        conceptId: 'c1',
        explanation: 'I have no idea what this concept means honestly.',
      });

      expect(result.grade).toBe('missed');
      // masteryDelta is 0 for "missed", so upsert should not be called
      expect(mockPrisma.userConceptMastery.upsert).not.toHaveBeenCalled();
    });

    it('should handle malformed AI response gracefully', async () => {
      mockPrisma.concept.findUnique.mockResolvedValue({
        id: 'c1',
        nameRu: 'Test',
        description: 'desc',
      });

      mockAi.chatCompletion.mockResolvedValue('not valid json at all');

      const result = await service.gradeExplanation(userId, {
        conceptId: 'c1',
        explanation: 'Some explanation that is at least 10 chars long.',
      });

      // Should fallback to 'partial'
      expect(result.grade).toBe('partial');
    });
  });
});
