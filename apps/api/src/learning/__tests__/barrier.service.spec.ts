/**
 * B25.12: Unit tests for BarrierService — scoring, threshold, retake logic
 */

import { Test } from '@nestjs/testing';
import { BarrierService } from '../barrier.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('BarrierService', () => {
  let service: BarrierService;
  let mockPrisma: Record<string, Record<string, jest.Mock>>;
  let mockAi: Record<string, jest.Mock>;

  const userId = 'user-123';
  const pathId = 'path-123';
  const barrierId = 'barrier-123';

  beforeEach(async () => {
    mockPrisma = {
      learningPath: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      learningDay: {
        findMany: jest.fn(),
      },
      levelBarrier: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      concept: {
        findUnique: jest.fn(),
      },
      userConceptMastery: {
        upsert: jest.fn(),
      },
    };

    mockAi = {
      chatCompletion: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        BarrierService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get(BarrierService);
  });

  describe('getBarrier', () => {
    it('should throw NotFoundException when no learning path exists', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      await expect(service.getBarrier(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when fewer than 3 days completed', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.learningDay.findMany.mockResolvedValue([
        { concept: { id: 'c1', nameRu: 'Concept 1' } },
        { concept: { id: 'c2', nameRu: 'Concept 2' } },
      ]);

      await expect(service.getBarrier(userId)).rejects.toThrow(BadRequestException);
    });

    it('should resume existing active barrier', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.learningDay.findMany.mockResolvedValue([
        { concept: { id: 'c1', nameRu: 'C1' } },
        { concept: { id: 'c2', nameRu: 'C2' } },
        { concept: { id: 'c3', nameRu: 'C3' } },
      ]);
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        level: 'SLEEPING',
        attemptNumber: 1,
        stages: { recall: {}, connect: {}, apply: {}, defend: {} },
      });

      const result = await service.getBarrier(userId);

      expect(result.barrierId).toBe(barrierId);
      expect(result.resuming).toBe(true);
    });

    it('should create new barrier when no active barrier exists', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.learningDay.findMany.mockResolvedValue([
        { concept: { id: 'c1', nameRu: 'C1' } },
        { concept: { id: 'c2', nameRu: 'C2' } },
        { concept: { id: 'c3', nameRu: 'C3' } },
        { concept: { id: 'c4', nameRu: 'C4' } },
      ]);
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(null);
      mockPrisma.levelBarrier.count.mockResolvedValue(0);
      mockPrisma.levelBarrier.create.mockResolvedValue({
        id: 'new-barrier',
        level: 'SLEEPING',
        attemptNumber: 1,
      });

      const result = await service.getBarrier(userId);

      expect(result.barrierId).toBe('new-barrier');
      expect(result.resuming).toBe(false);
      expect(result.attemptNumber).toBe(1);
      expect(result.stages).toHaveProperty('recall');
      expect(result.stages.recall.questions.length).toBeLessThanOrEqual(6);
    });
  });

  describe('submitRecall', () => {
    it('should reject when recall already completed', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        pathId,
        stages: { recall: { questions: [], results: { avgScore: 0.5 } } },
      });

      await expect(
        service.submitRecall(userId, { answers: [] }),
      ).rejects.toThrow(ConflictException);
    });

    it('should grade answers via AI and return avg score', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        pathId,
        stages: {
          recall: { questions: [{ conceptId: 'c1' }], results: null },
          connect: { pairs: [], results: null },
          apply: { situations: [], results: null },
          defend: { rounds: [], results: null },
        },
      });

      mockPrisma.concept.findUnique.mockResolvedValue({
        id: 'c1',
        nameRu: 'Test Concept',
        description: 'A test concept',
      });

      mockAi.chatCompletion.mockResolvedValue(
        JSON.stringify({ score: 0.9, feedback: 'Excellent' }),
      );

      mockPrisma.levelBarrier.update.mockResolvedValue({});

      const result = await service.submitRecall(userId, {
        answers: [{ conceptId: 'c1', answer: 'This is about cognitive patterns' }],
      });

      expect(result.stage).toBe('recall');
      expect(result.avgScore).toBeCloseTo(0.9);
      expect(result.results).toHaveLength(1);
    });

    it('should handle AI failure gracefully with 0.5 default score', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        pathId,
        stages: {
          recall: { questions: [{ conceptId: 'c1' }], results: null },
          connect: { pairs: [], results: null },
          apply: { situations: [], results: null },
          defend: { rounds: [], results: null },
        },
      });

      mockPrisma.concept.findUnique.mockResolvedValue({ id: 'c1', nameRu: 'Test', description: 'test' });
      mockAi.chatCompletion.mockResolvedValue('invalid json response');
      mockPrisma.levelBarrier.update.mockResolvedValue({});

      const result = await service.submitRecall(userId, {
        answers: [{ conceptId: 'c1', answer: 'Some recall attempt here' }],
      });

      expect(result.avgScore).toBeCloseTo(0.5);
    });
  });

  describe('completeBarrier', () => {
    const makeBarrierWithScores = (recall: number, connect: number, apply: number, defend: number) => ({
      id: barrierId,
      pathId,
      passed: null,
      stages: {
        recall: { results: { avgScore: recall } },
        connect: { results: { avgScore: connect } },
        apply: { results: { avgScore: apply } },
        defend: { results: { score: defend } },
        verdict: null,
      },
    });

    it('should reject when not all stages completed', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        pathId,
        passed: null,
        stages: {
          recall: { results: { avgScore: 0.8 } },
          connect: { results: null },
          apply: { results: null },
          defend: { results: null },
        },
      });

      await expect(service.completeBarrier(userId)).rejects.toThrow(BadRequestException);
    });

    it('should PASS when weighted score >= 0.6', async () => {
      // recall 20% + connect 25% + apply 30% + defend 25% = weighted avg
      // 0.8*0.2 + 0.7*0.25 + 0.8*0.3 + 0.7*0.25 = 0.16 + 0.175 + 0.24 + 0.175 = 0.75
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(
        makeBarrierWithScores(0.8, 0.7, 0.8, 0.7),
      );
      mockPrisma.levelBarrier.update.mockResolvedValue({});
      mockPrisma.learningPath.update.mockResolvedValue({});

      const result = await service.completeBarrier(userId);

      expect(result.passed).toBe(true);
      expect(result.totalScore).toBeCloseTo(0.75, 2);
      expect(result.newLevel).toBe('AWAKENED');
    });

    it('should FAIL when weighted score < 0.6', async () => {
      // 0.3*0.2 + 0.4*0.25 + 0.3*0.3 + 0.2*0.25 = 0.06 + 0.1 + 0.09 + 0.05 = 0.3
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(
        makeBarrierWithScores(0.3, 0.4, 0.3, 0.2),
      );
      mockPrisma.levelBarrier.update.mockResolvedValue({});

      const result = await service.completeBarrier(userId);

      expect(result.passed).toBe(false);
      expect(result.totalScore).toBeCloseTo(0.3, 2);
      expect(result.newLevel).toBeNull();
    });

    it('should PASS at exact threshold 0.6', async () => {
      // 0.6*0.2 + 0.6*0.25 + 0.6*0.3 + 0.6*0.25 = 0.12 + 0.15 + 0.18 + 0.15 = 0.6
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(
        makeBarrierWithScores(0.6, 0.6, 0.6, 0.6),
      );
      mockPrisma.levelBarrier.update.mockResolvedValue({});
      mockPrisma.learningPath.update.mockResolvedValue({});

      const result = await service.completeBarrier(userId);

      expect(result.passed).toBe(true);
      expect(result.totalScore).toBeCloseTo(0.6, 2);
    });

    it('should correctly advance through level progression', async () => {
      // Test each level transition
      const levels = ['SLEEPING', 'AWAKENED', 'OBSERVER', 'WARRIOR', 'STRATEGIST'];
      const nextLevels = ['AWAKENED', 'OBSERVER', 'WARRIOR', 'STRATEGIST', 'MASTER'];

      for (let i = 0; i < levels.length; i++) {
        mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: levels[i] });
        mockPrisma.levelBarrier.findFirst.mockResolvedValue(
          makeBarrierWithScores(1.0, 1.0, 1.0, 1.0),
        );
        mockPrisma.levelBarrier.update.mockResolvedValue({});
        mockPrisma.learningPath.update.mockResolvedValue({});

        const result = await service.completeBarrier(userId);

        expect(result.passed).toBe(true);
        expect(result.newLevel).toBe(nextLevels[i]);
      }
    });

    it('should apply correct weighted percentages', async () => {
      // Only recall is perfect, others are 0 → should get 0.2 (recall weight)
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(
        makeBarrierWithScores(1.0, 0, 0, 0),
      );
      mockPrisma.levelBarrier.update.mockResolvedValue({});

      const result = await service.completeBarrier(userId);

      expect(result.totalScore).toBeCloseTo(0.2, 2);
      expect(result.passed).toBe(false);
    });
  });

  describe('getRetakeInfo', () => {
    it('should throw when no failed barrier exists', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue(null);

      await expect(service.getRetakeInfo(userId)).rejects.toThrow(NotFoundException);
    });

    it('should identify weak concepts from recall scores below 0.5', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, currentLevel: 'SLEEPING' });
      mockPrisma.levelBarrier.findFirst.mockResolvedValue({
        id: barrierId,
        attemptNumber: 1,
        score: 0.35,
        stages: {
          recall: {
            results: {
              answers: [
                { conceptId: 'c1', score: 0.2 },
                { conceptId: 'c2', score: 0.8 },
                { conceptId: 'c3', score: 0.3 },
              ],
            },
          },
        },
      });

      mockPrisma.learningDay.findMany.mockResolvedValue([
        { concept: { id: 'c1', nameRu: 'Weak Concept 1', branch: 'LOGIC' }, dayNumber: 2 },
        { concept: { id: 'c3', nameRu: 'Weak Concept 3', branch: 'STRATEGY' }, dayNumber: 4 },
      ]);

      const result = await service.getRetakeInfo(userId);

      expect(result.weakConcepts).toHaveLength(2);
      expect(result.weakConcepts[0].conceptId).toBe('c1');
      expect(result.weakConcepts[1].conceptId).toBe('c3');
      expect(result.canRetake).toBe(true);
    });
  });
});
