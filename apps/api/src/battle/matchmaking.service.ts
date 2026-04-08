import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Branch } from '@razum/shared';

const MATCHMAKING_QUEUE_KEY = 'matchmaking:queue';
const INITIAL_RATING_RANGE = 100;
const RANGE_EXPAND_STEP = 50;
const RANGE_EXPAND_INTERVAL_MS = 5000;
const MAX_RATING_RANGE = 500;
const MATCHMAKING_TIMEOUT_MS = 30000;

export interface MatchResult {
  opponentId: string;
  opponentRating: number;
}

export interface QueueEntry {
  userId: string;
  rating: number;
  branch?: Branch;
  joinedAt: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Build the Redis sorted-set key for matchmaking.
   * When a branch is specified, players are queued per-branch so that
   * the rating used for matching corresponds to that specific branch.
   * Fallback: the generic queue uses overall rating.
   */
  private queueKey(branch?: Branch): string {
    return branch ? `${MATCHMAKING_QUEUE_KEY}:${branch}` : MATCHMAKING_QUEUE_KEY;
  }

  private joinedKey(userId: string): string {
    return `matchmaking:joined:${userId}`;
  }

  async addToQueue(userId: string, rating: number, branch?: Branch): Promise<void> {
    const key = this.queueKey(branch);
    await this.redis.zadd(key, rating, userId);
    await this.redis.set(
      this.joinedKey(userId),
      JSON.stringify({ rating, branch, joinedAt: Date.now() }),
      120,
    );
    const branchLabel = branch ?? 'overall';
    this.logger.log(`User ${userId} added to queue [${branchLabel}] (rating: ${rating})`);
  }

  async removeFromQueue(userId: string): Promise<void> {
    // Read the stored entry to know which branch queue to clean up
    const raw = await this.redis.get(this.joinedKey(userId));
    if (raw) {
      const entry = JSON.parse(raw) as QueueEntry;
      const key = this.queueKey(entry.branch);
      await this.redis.zrem(key, userId);
    }
    // Also remove from the generic queue (safety fallback)
    await this.redis.zrem(MATCHMAKING_QUEUE_KEY, userId);
    await this.redis.del(this.joinedKey(userId));
  }

  async isInQueue(userId: string): Promise<boolean> {
    const entry = await this.redis.get(this.joinedKey(userId));
    return entry !== null;
  }

  /**
   * Calculate current rating range based on wait time.
   * Starts at ±100, expands by 50 every 5 seconds, max ±500.
   */
  private calculateRatingRange(waitTimeMs: number): number {
    const expansions = Math.floor(waitTimeMs / RANGE_EXPAND_INTERVAL_MS);
    return Math.min(INITIAL_RATING_RANGE + expansions * RANGE_EXPAND_STEP, MAX_RATING_RANGE);
  }

  /**
   * Check if user has been waiting longer than the timeout.
   * If so, they should be offered a bot match instead.
   */
  async hasTimedOut(userId: string): Promise<boolean> {
    const raw = await this.redis.get(this.joinedKey(userId));
    if (!raw) return false;

    const entry = JSON.parse(raw) as QueueEntry;
    return Date.now() - entry.joinedAt >= MATCHMAKING_TIMEOUT_MS;
  }

  /**
   * Find a match for the given user.
   * When branch is provided, searches the branch-specific queue using
   * branch ELO ratings. Falls back to the generic queue otherwise.
   * Returns opponent info if found, null if no match yet.
   */
  async findMatch(userId: string, rating: number, branch?: Branch): Promise<MatchResult | null> {
    const raw = await this.redis.get(this.joinedKey(userId));
    const waitTime = raw ? Date.now() - (JSON.parse(raw) as QueueEntry).joinedAt : 0;

    const ratingRange = this.calculateRatingRange(waitTime);
    const minRating = rating - ratingRange;
    const maxRating = rating + ratingRange;

    const key = this.queueKey(branch);
    const candidates = await this.redis.zrangebyscore(key, minRating, maxRating);

    const opponents = candidates.filter((id) => id !== userId);

    if (opponents.length === 0) {
      return null;
    }

    // Pick the first (closest rated) opponent
    const opponentId = opponents[0]!;

    // Get opponent rating from their queue entry
    const opponentRaw = await this.redis.get(this.joinedKey(opponentId));
    const opponentRating = opponentRaw ? (JSON.parse(opponentRaw) as QueueEntry).rating : 1000;

    // Remove both from queue
    await this.removeFromQueue(userId);
    await this.removeFromQueue(opponentId);

    const branchLabel = branch ?? 'overall';
    this.logger.log(`Match found [${branchLabel}]: ${userId} vs ${opponentId} (range: ±${ratingRange})`);

    return { opponentId, opponentRating };
  }

  /**
   * Get queue size for monitoring (optionally per branch).
   */
  async getQueueSize(branch?: Branch): Promise<number> {
    const key = this.queueKey(branch);
    const all = await this.redis.zrangebyscore(key, -Infinity, Infinity);
    return all.length;
  }
}
