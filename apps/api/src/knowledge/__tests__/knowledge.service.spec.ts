/**
 * BT.15 — Unit tests for KnowledgeService
 *
 * Tests:
 * - searchSimilar: vector search, branch/category filters, similarity threshold
 * - searchSimilar: empty results, no embedding (openai disabled)
 * - findByTopic: wrapper defaults (limit=10, minSimilarity=0.2)
 * - getContextForQuestion: formatted output, empty chunks fallback
 * - getStats: aggregation, zero chunks, multiple branches/categories
 * - generateEmbedding: error handling, empty response
 * - SQL WHERE clause construction: no filters, branch only, category only, both
 */

import { Test } from '@nestjs/testing';
import { KnowledgeService, SimilarChunk } from '../knowledge.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// ── Helpers ─────────────────────────────────────────────────────

const makeChunk = (overrides: Partial<SimilarChunk> = {}): SimilarChunk => ({
  id: 'chunk-1',
  content: 'Test content about strategy',
  source: 'Book A',
  category: 'decision-making',
  topic: 'risk assessment',
  branch: 'STRATEGY',
  metadata: {},
  similarity: 0.85,
  ...overrides,
});

const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);

// ── Mocks ───────────────────────────────────────────────────────

const mockOpenAI = {
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{ embedding: fakeEmbedding }],
    }),
  },
};

// Intercept OpenAI require — service loads it dynamically
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => mockOpenAI),
}));

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-openai-key'),
};

// ── Suite ────────────────────────────────────────────────────────

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue('test-openai-key');

    const module = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(KnowledgeService);
  });

  // ── searchSimilar ─────────────────────────────────────────────

  describe('searchSimilar', () => {
    it('should return chunks above similarity threshold', async () => {
      const high = makeChunk({ id: '1', similarity: 0.9 });
      const low = makeChunk({ id: '2', similarity: 0.1 });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([high, low]);

      const results = await service.searchSimilar('strategy tips', {
        minSimilarity: 0.3,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
      expect(results[0].similarity).toBe(0.9);
    });

    it('should filter by branch when provided', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('logic puzzles', { branch: 'LOGIC' });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('branch = $2::"Branch"');
      // branch value passed as param
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0][2]).toBe('LOGIC');
    });

    it('should filter by category when provided', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test', { category: 'puzzles' });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('category = $2');
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0][2]).toBe('puzzles');
    });

    it('should filter by both branch and category', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test', {
        branch: 'ERUDITION',
        category: 'history',
      });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('branch = $2::"Branch"');
      expect(sql).toContain('category = $3');
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0][2]).toBe('ERUDITION');
      expect(mockPrisma.$queryRawUnsafe.mock.calls[0][3]).toBe('history');
    });

    it('should use default limit=5 and minSimilarity=0.3', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test');

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 5');
    });

    it('should respect custom limit', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test', { limit: 20 });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 20');
    });

    it('should return empty array when no results', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const results = await service.searchSimilar('nonexistent topic');

      expect(results).toEqual([]);
    });

    it('should return empty when all results below threshold', async () => {
      const lowChunks = [
        makeChunk({ id: '1', similarity: 0.1 }),
        makeChunk({ id: '2', similarity: 0.2 }),
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(lowChunks);

      const results = await service.searchSimilar('test', {
        minSimilarity: 0.5,
      });

      expect(results).toEqual([]);
    });

    it('should pass embedding vector as first parameter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test query');

      const vectorStr = mockPrisma.$queryRawUnsafe.mock.calls[0][1] as string;
      expect(vectorStr).toMatch(/^\[[\d.,]+\]$/);
      // Verify it contains the fake embedding values
      expect(vectorStr).toContain('0');
      expect(vectorStr).toContain('0.001');
    });

    it('should generate SQL without WHERE branch/category when no filters', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test');

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).not.toContain('branch =');
      expect(sql).not.toContain('category =');
      // Should still require embedding IS NOT NULL
      expect(sql).toContain('embedding IS NOT NULL');
    });

    it('should call OpenAI embeddings API with correct model', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.searchSimilar('test query');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test query',
      });
    });

    it('should propagate embedding generation errors', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('OpenAI rate limit'),
      );

      await expect(service.searchSimilar('test')).rejects.toThrow(
        'OpenAI rate limit',
      );
    });

    it('should throw on empty embedding response', async () => {
      mockOpenAI.embeddings.create.mockResolvedValueOnce({ data: [] });

      await expect(service.searchSimilar('test')).rejects.toThrow(
        'Empty embedding response',
      );
    });
  });

  // ── findByTopic ───────────────────────────────────────────────

  describe('findByTopic', () => {
    it('should use default limit=10 and minSimilarity=0.2', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.findByTopic('game theory');

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 10');
    });

    it('should pass branch filter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.findByTopic('rhetoric', { branch: 'RHETORIC' });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('branch = $2::"Branch"');
    });

    it('should respect custom limit', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.findByTopic('logic', { limit: 3 });

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 3');
    });

    it('should return chunks with similarity >= 0.2', async () => {
      const chunks = [
        makeChunk({ similarity: 0.25 }),
        makeChunk({ id: 'low', similarity: 0.15 }),
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(chunks);

      const results = await service.findByTopic('intuition');

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.25);
    });
  });

  // ── getContextForQuestion ─────────────────────────────────────

  describe('getContextForQuestion', () => {
    it('should return formatted context string', async () => {
      const chunks = [
        makeChunk({ source: 'Book A', content: 'Content A', similarity: 0.9 }),
        makeChunk({
          id: '2',
          source: 'Book B',
          content: 'Content B',
          similarity: 0.7,
        }),
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(chunks);

      const context = await service.getContextForQuestion(
        'risk',
        'STRATEGY',
        2,
      );

      expect(context).toContain('--- Источник 1: Book A (similarity: 0.90) ---');
      expect(context).toContain('Content A');
      expect(context).toContain('--- Источник 2: Book B (similarity: 0.70) ---');
      expect(context).toContain('Content B');
    });

    it('should return empty string when no chunks found', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const context = await service.getContextForQuestion(
        'unknown',
        'LOGIC',
        3,
      );

      expect(context).toBe('');
    });

    it('should return empty string when all chunks below threshold', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        makeChunk({ similarity: 0.1 }),
      ]);

      const context = await service.getContextForQuestion(
        'test',
        'INTUITION',
        3,
      );

      expect(context).toBe('');
    });

    it('should use minSimilarity=0.25 for question context', async () => {
      const chunks = [
        makeChunk({ similarity: 0.26 }),
        makeChunk({ id: '2', similarity: 0.24 }),
      ];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(chunks);

      const context = await service.getContextForQuestion(
        'test',
        'STRATEGY',
        5,
      );

      // Only chunk with similarity 0.26 passes the 0.25 threshold
      expect(context).toContain('Источник 1');
      expect(context).not.toContain('Источник 2');
    });

    it('should default to count=3', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await service.getContextForQuestion('test', 'ERUDITION');

      const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 3');
    });
  });

  // ── getStats ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(100) }]) // total
        .mockResolvedValueOnce([{ count: BigInt(80) }]) // with embeddings
        .mockResolvedValueOnce([
          // by branch
          { branch: 'STRATEGY', count: BigInt(40) },
          { branch: 'LOGIC', count: BigInt(30) },
          { branch: 'ERUDITION', count: BigInt(30) },
        ])
        .mockResolvedValueOnce([
          // by category
          { category: 'game-theory', count: BigInt(25) },
          { category: 'puzzles', count: BigInt(20) },
        ])
        .mockResolvedValueOnce([
          // sources
          { source: 'Book A' },
          { source: 'Blog B' },
        ]);

      const stats = await service.getStats();

      expect(stats.totalChunks).toBe(100);
      expect(stats.withEmbeddings).toBe(80);
      expect(stats.byBranch).toEqual({
        STRATEGY: 40,
        LOGIC: 30,
        ERUDITION: 30,
      });
      expect(stats.byCategory).toEqual({
        'game-theory': 25,
        puzzles: 20,
      });
      expect(stats.sources).toEqual(['Book A', 'Blog B']);
    });

    it('should handle zero chunks', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await service.getStats();

      expect(stats.totalChunks).toBe(0);
      expect(stats.withEmbeddings).toBe(0);
      expect(stats.byBranch).toEqual({});
      expect(stats.byCategory).toEqual({});
      expect(stats.sources).toEqual([]);
    });

    it('should handle all 5 branches', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(500) }])
        .mockResolvedValueOnce([{ count: BigInt(500) }])
        .mockResolvedValueOnce([
          { branch: 'STRATEGY', count: BigInt(100) },
          { branch: 'LOGIC', count: BigInt(100) },
          { branch: 'ERUDITION', count: BigInt(100) },
          { branch: 'RHETORIC', count: BigInt(100) },
          { branch: 'INTUITION', count: BigInt(100) },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await service.getStats();

      expect(Object.keys(stats.byBranch)).toHaveLength(5);
      expect(stats.byBranch.STRATEGY).toBe(100);
      expect(stats.byBranch.INTUITION).toBe(100);
    });
  });

  // ── OpenAI disabled (no API key) ─────────────────────────────

  describe('when OPENAI_API_KEY is not set', () => {
    let disabledService: KnowledgeService;

    beforeEach(async () => {
      mockConfig.get.mockReturnValue(undefined);

      const module = await Test.createTestingModule({
        providers: [
          KnowledgeService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();

      disabledService = module.get(KnowledgeService);
    });

    it('should throw when trying to search (no openai client)', async () => {
      await expect(
        disabledService.searchSimilar('test'),
      ).rejects.toThrow();
    });

    it('should throw when trying to find by topic', async () => {
      await expect(
        disabledService.findByTopic('test'),
      ).rejects.toThrow();
    });

    it('should throw when trying to get context for question', async () => {
      await expect(
        disabledService.getContextForQuestion('test', 'STRATEGY'),
      ).rejects.toThrow();
    });

    it('should still return stats (no embedding needed)', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(10) }])
        .mockResolvedValueOnce([{ count: BigInt(5) }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await disabledService.getStats();
      expect(stats.totalChunks).toBe(10);
    });
  });
});
