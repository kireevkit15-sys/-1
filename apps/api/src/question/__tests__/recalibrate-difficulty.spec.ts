/**
 * BT.11 — Unit tests for QuestionService.recalibrateDifficulty()
 *
 * Tests boundary conditions:
 * - Too easy (>85% correct) → difficulty UP
 * - Too hard (<25% correct) → difficulty DOWN
 * - <20 answers → skipped (not enough data)
 * - Exact boundary values (85%, 25%) → no change
 * - GOLD + too easy → already max, no change
 * - BRONZE + too hard → already min, no change
 * - No qualifying questions → empty result
 * - Mixed batch: some change, some stay
 * - Counters reset after recalibration
 */

import { Test } from '@nestjs/testing';
import { QuestionService } from '../question.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AiService } from '../../ai/ai.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { StatsService } from '../../stats/stats.service';

// ── Mocks ──────────────────────────────────────────────────────

const mockPrisma = {
  question: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockAiService = {};
const mockKnowledgeService = {};
const mockStatsService = {};

// ── Suite ────────────────────────────��─────────────────────────

describe('QuestionService.recalibrateDifficulty', () => {
  let service: QuestionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        QuestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiService, useValue: mockAiService },
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: StatsService, useValue: mockStatsService },
      ],
    }).compile();

    service = module.get(QuestionService);
  });

  // ── 1. No qualifying questions ──────────────────────────────

  it('should return empty result when no questions meet threshold', async () => {
    mockPrisma.question.findMany.mockResolvedValue([]);

    const result = await service.recalibrateDifficulty();

    expect(result).toEqual({ analyzed: 0, adjusted: 0, changes: [] });
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 2. Too easy: BRONZE (90% correct, 30 answers) → SILVER ──

  it('should upgrade BRONZE → SILVER when correctRate > 85%', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q1', difficulty: 'BRONZE', totalAnswers: 30, correctAnswers: 27 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(1);
    expect(result.changes[0]).toEqual(
      expect.objectContaining({
        questionId: 'q1',
        oldDifficulty: 'BRONZE',
        newDifficulty: 'SILVER',
      }),
    );

    expect(mockPrisma.question.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: expect.objectContaining({
        difficulty: 'SILVER',
        totalAnswers: 0,
        correctAnswers: 0,
      }),
    });
  });

  // ── 3. Too easy: SILVER → GOLD ──────────────────────────────

  it('should upgrade SILVER → GOLD when correctRate > 85%', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q2', difficulty: 'SILVER', totalAnswers: 50, correctAnswers: 48 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.adjusted).toBe(1);
    expect(result.changes[0]!.newDifficulty).toBe('GOLD');
  });

  // ── 4. Too hard: GOLD (20% correct) → SILVER ───────────────

  it('should downgrade GOLD → SILVER when correctRate < 25%', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q3', difficulty: 'GOLD', totalAnswers: 25, correctAnswers: 5 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.adjusted).toBe(1);
    expect(result.changes[0]).toEqual(
      expect.objectContaining({
        questionId: 'q3',
        oldDifficulty: 'GOLD',
        newDifficulty: 'SILVER',
      }),
    );
  });

  // ── 5. Too hard: SILVER → BRONZE ──────���─────────────────────

  it('should downgrade SILVER → BRONZE when correctRate < 25%', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q4', difficulty: 'SILVER', totalAnswers: 40, correctAnswers: 8 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.adjusted).toBe(1);
    expect(result.changes[0]!.newDifficulty).toBe('BRONZE');
  });

  // ── 6. GOLD at max — cannot go higher ───────────────────────

  it('should NOT upgrade GOLD when already at max difficulty', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q5', difficulty: 'GOLD', totalAnswers: 100, correctAnswers: 95 },
    ]);

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(0);
    expect(result.changes).toEqual([]);
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 7. BRONZE at min — cannot go lower ─────────────────���────

  it('should NOT downgrade BRONZE when already at min difficulty', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q6', difficulty: 'BRONZE', totalAnswers: 30, correctAnswers: 3 },
    ]);

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(0);
    expect(result.changes).toEqual([]);
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 8. Exact boundary: 85% correct → no change ─────────────

  it('should NOT change difficulty at exactly 85% correct rate', async () => {
    // 85% = boundary, threshold is > 0.85, so exactly 0.85 should NOT trigger
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q7', difficulty: 'BRONZE', totalAnswers: 20, correctAnswers: 17 },
    ]);

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(0);
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 9. Exact boundary: 25% correct → no change ─────────────

  it('should NOT change difficulty at exactly 25% correct rate', async () => {
    // 25% = boundary, threshold is < 0.25, so exactly 0.25 should NOT trigger
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q8', difficulty: 'GOLD', totalAnswers: 20, correctAnswers: 5 },
    ]);

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(0);
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 10. Normal range (50% correct) → no change ─────────────

  it('should NOT change difficulty when correctRate is in normal range', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q9', difficulty: 'SILVER', totalAnswers: 100, correctAnswers: 50 },
    ]);

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(1);
    expect(result.adjusted).toBe(0);
    expect(mockPrisma.question.update).not.toHaveBeenCalled();
  });

  // ── 11. Mixed batch: some change, some don't ───────────────

  it('should handle mixed batch — upgrade, downgrade, and skip', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      // Too easy BRONZE → SILVER
      { id: 'easy', difficulty: 'BRONZE', totalAnswers: 50, correctAnswers: 48 },
      // Normal range — no change
      { id: 'normal', difficulty: 'SILVER', totalAnswers: 50, correctAnswers: 30 },
      // Too hard GOLD → SILVER
      { id: 'hard', difficulty: 'GOLD', totalAnswers: 50, correctAnswers: 10 },
      // Too easy GOLD — already max, skip
      { id: 'maxed', difficulty: 'GOLD', totalAnswers: 50, correctAnswers: 49 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.analyzed).toBe(4);
    expect(result.adjusted).toBe(2);
    expect(result.changes).toHaveLength(2);

    const ids = result.changes.map((c) => c.questionId);
    expect(ids).toContain('easy');
    expect(ids).toContain('hard');
    expect(ids).not.toContain('normal');
    expect(ids).not.toContain('maxed');
  });

  // ── 12. Counters reset after calibration ────────────────────

  it('should reset totalAnswers and correctAnswers to 0 after recalibration', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q10', difficulty: 'BRONZE', totalAnswers: 100, correctAnswers: 90 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    await service.recalibrateDifficulty();

    expect(mockPrisma.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalAnswers: 0,
          correctAnswers: 0,
        }),
      }),
    );
  });

  // ── 13. lastCalibratedAt is set ────────���────────────────────

  it('should set lastCalibratedAt date on recalibrated questions', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q11', difficulty: 'SILVER', totalAnswers: 30, correctAnswers: 28 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const before = new Date();
    await service.recalibrateDifficulty();
    const after = new Date();

    const updateCall = mockPrisma.question.update.mock.calls[0]![0];
    const calibratedAt = updateCall.data.lastCalibratedAt as Date;

    expect(calibratedAt).toBeInstanceOf(Date);
    expect(calibratedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(calibratedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  // ── 14. correctRate rounding in result ──────────────────────

  it('should round correctRate to 2 decimal places in changes', async () => {
    // 27/30 = 0.9 → rounded to 0.9
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q12', difficulty: 'BRONZE', totalAnswers: 30, correctAnswers: 27 },
    ]);
    mockPrisma.question.update.mockResolvedValue({});

    const result = await service.recalibrateDifficulty();

    expect(result.changes[0]!.correctRate).toBe(0.9);

    // 26/30 = 0.8666... → 0.87
    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q13', difficulty: 'BRONZE', totalAnswers: 30, correctAnswers: 26 },
    ]);

    const result2 = await service.recalibrateDifficulty();

    expect(result2.changes[0]!.correctRate).toBe(0.87);
  });
});
