/**
 * BT.12 — Unit tests for MatchmakingService
 *
 * Tests: range expansion, timeout → bot, concurrent queue,
 * branch-specific queues, queue cleanup, edge cases.
 */

import { Test } from '@nestjs/testing';
import { MatchmakingService } from '../matchmaking.service';
import { RedisService } from '../../redis/redis.service';

// ── Mock Redis (in-memory sorted set + kv) ───────────────────

class MockRedisService {
  private kv = new Map<string, string>();
  private sortedSets = new Map<string, Map<string, number>>();

  async zadd(key: string, score: number, member: string): Promise<void> {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    this.sortedSets.get(key)!.set(member, score);
  }

  async zrem(key: string, member: string): Promise<void> {
    this.sortedSets.get(key)?.delete(member);
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    const results: Array<{ member: string; score: number }> = [];
    for (const [member, score] of set) {
      if (score >= min && score <= max) {
        results.push({ member, score });
      }
    }
    // Sort by score ascending (closest first)
    results.sort((a, b) => a.score - b.score);
    return results.map((r) => r.member);
  }

  async set(key: string, value: string, _ttl?: number): Promise<void> {
    this.kv.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key) ?? null;
  }

  async del(key: string): Promise<void> {
    this.kv.delete(key);
  }

  // Test helper: clear all data
  clear(): void {
    this.kv.clear();
    this.sortedSets.clear();
  }

  // Test helper: override joinedAt for a user
  setJoinedAt(userId: string, joinedAt: number): void {
    const key = `matchmaking:joined:${userId}`;
    const raw = this.kv.get(key);
    if (raw) {
      const entry = JSON.parse(raw);
      entry.joinedAt = joinedAt;
      this.kv.set(key, JSON.stringify(entry));
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let redis: MockRedisService;

  beforeEach(async () => {
    redis = new MockRedisService();

    const module = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(MatchmakingService);
  });

  afterEach(() => {
    redis.clear();
  });

  // ── 1. Basic queue operations ──────────────────────────────

  describe('Queue operations', () => {
    it('should add user to queue', async () => {
      await service.addToQueue('user1', 1000);
      expect(await service.isInQueue('user1')).toBe(true);
    });

    it('should remove user from queue', async () => {
      await service.addToQueue('user1', 1000);
      await service.removeFromQueue('user1');
      expect(await service.isInQueue('user1')).toBe(false);
    });

    it('should report correct queue size', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1100);
      await service.addToQueue('user3', 900);

      const size = await service.getQueueSize();
      expect(size).toBe(3);
    });

    it('should not be in queue if never added', async () => {
      expect(await service.isInQueue('ghost')).toBe(false);
    });
  });

  // ── 2. Match finding — initial range ±100 ──────────────────

  describe('findMatch — initial range', () => {
    it('should find match within ±100 rating range', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1050);

      const match = await service.findMatch('user1', 1000);

      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('user2');
      expect(match!.opponentRating).toBe(1050);
    });

    it('should NOT find match outside ±100 range', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1200); // 200 away — too far

      const match = await service.findMatch('user1', 1000);

      expect(match).toBeNull();
    });

    it('should not match user with themselves', async () => {
      await service.addToQueue('user1', 1000);

      const match = await service.findMatch('user1', 1000);

      expect(match).toBeNull();
    });

    it('should remove both players from queue after match', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1050);

      await service.findMatch('user1', 1000);

      expect(await service.isInQueue('user1')).toBe(false);
      expect(await service.isInQueue('user2')).toBe(false);
    });
  });

  // ── 3. Range expansion over time ───────────────────────────

  describe('Range expansion', () => {
    it('should expand range by 50 after 5 seconds of waiting', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1150); // 150 away

      // Simulate 5 seconds of waiting → range becomes ±150
      redis.setJoinedAt('user1', Date.now() - 5001);

      const match = await service.findMatch('user1', 1000);

      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('user2');
    });

    it('should expand range by 100 after 10 seconds', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1200); // 200 away

      // Simulate 10 seconds → range becomes ±200
      redis.setJoinedAt('user1', Date.now() - 10001);

      const match = await service.findMatch('user1', 1000);

      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('user2');
    });

    it('should cap range at ±500 maximum', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1500); // 500 away

      // Simulate very long wait (60s) → range capped at ±500
      redis.setJoinedAt('user1', Date.now() - 60000);

      const match = await service.findMatch('user1', 1000);

      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('user2');
    });

    it('should NOT match at ±501 even after max expansion', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1501); // 501 away — beyond max

      redis.setJoinedAt('user1', Date.now() - 60000);

      const match = await service.findMatch('user1', 1000);

      expect(match).toBeNull();
    });
  });

  // ── 4. Timeout → bot ───────────────────────────────────────

  describe('Timeout detection', () => {
    it('should NOT timeout before 30 seconds', async () => {
      await service.addToQueue('user1', 1000);
      redis.setJoinedAt('user1', Date.now() - 29000);

      expect(await service.hasTimedOut('user1')).toBe(false);
    });

    it('should timeout after 30 seconds', async () => {
      await service.addToQueue('user1', 1000);
      redis.setJoinedAt('user1', Date.now() - 30001);

      expect(await service.hasTimedOut('user1')).toBe(true);
    });

    it('should return false for non-queued user', async () => {
      expect(await service.hasTimedOut('ghost')).toBe(false);
    });
  });

  // ── 5. Branch-specific queues ──────────────────────────────

  describe('Branch-specific queues', () => {
    it('should queue users in branch-specific queue', async () => {
      await service.addToQueue('user1', 1200, 'STRATEGY' as any);
      await service.addToQueue('user2', 1250, 'STRATEGY' as any);

      const match = await service.findMatch('user1', 1200, 'STRATEGY' as any);

      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('user2');
    });

    it('should NOT cross-match between different branches', async () => {
      await service.addToQueue('user1', 1000, 'STRATEGY' as any);
      await service.addToQueue('user2', 1050, 'LOGIC' as any);

      // user1 searches in STRATEGY queue — user2 is in LOGIC
      const match = await service.findMatch('user1', 1000, 'STRATEGY' as any);

      expect(match).toBeNull();
    });

    it('should track separate queue sizes per branch', async () => {
      await service.addToQueue('u1', 1000, 'STRATEGY' as any);
      await service.addToQueue('u2', 1000, 'STRATEGY' as any);
      await service.addToQueue('u3', 1000, 'LOGIC' as any);

      expect(await service.getQueueSize('STRATEGY' as any)).toBe(2);
      expect(await service.getQueueSize('LOGIC' as any)).toBe(1);
    });
  });

  // ── 6. Concurrent users ────────────────────────────────────

  describe('Concurrent queue handling', () => {
    it('should match closest-rated opponent from multiple candidates', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1090); // 90 away
      await service.addToQueue('user3', 1010); // 10 away — closer

      // zrangebyscore returns sorted by score, user3 (1010) is first after user1 (1000)
      // but user1 is filtered out, so user3 should be picked
      const match = await service.findMatch('user1', 1000);

      expect(match).not.toBeNull();
      // The service picks the first result from sorted set (closest rated)
      expect(match!.opponentId).toBe('user3');
    });

    it('should handle 3 users — first pair matches, third stays', async () => {
      await service.addToQueue('user1', 1000);
      await service.addToQueue('user2', 1050);
      await service.addToQueue('user3', 1080);

      // user1 matches with user2
      const match = await service.findMatch('user1', 1000);
      expect(match).not.toBeNull();

      // user3 should still be in queue
      expect(await service.isInQueue('user3')).toBe(true);
      expect(await service.getQueueSize()).toBe(1);
    });
  });

  // ── 7. Edge cases ──────────────────────────────────────────

  describe('Edge cases', () => {
    it('should handle removing non-existent user from queue gracefully', async () => {
      // Should not throw
      await expect(service.removeFromQueue('nonexistent')).resolves.not.toThrow();
    });

    it('should handle very low rating (0)', async () => {
      await service.addToQueue('newbie', 0);
      await service.addToQueue('also-newbie', 50);

      const match = await service.findMatch('newbie', 0);
      expect(match).not.toBeNull();
      expect(match!.opponentId).toBe('also-newbie');
    });

    it('should handle very high rating (3000)', async () => {
      await service.addToQueue('grandmaster', 3000);
      await service.addToQueue('master', 2950);

      const match = await service.findMatch('grandmaster', 3000);
      expect(match).not.toBeNull();
    });

    it('should return queue size 0 for empty queue', async () => {
      expect(await service.getQueueSize()).toBe(0);
    });
  });
});
