import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

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
  joinedAt: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(private readonly redis: RedisService) {}

  async addToQueue(userId: string, rating: number): Promise<void> {
    await this.redis.zadd(MATCHMAKING_QUEUE_KEY, rating, userId);
    await this.redis.set(
      `matchmaking:joined:${userId}`,
      JSON.stringify({ rating, joinedAt: Date.now() }),
      120,
    );
    this.logger.log(`User ${userId} added to queue (rating: ${rating})`);
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.redis.zrem(MATCHMAKING_QUEUE_KEY, userId);
    await this.redis.del(`matchmaking:joined:${userId}`);
  }

  async isInQueue(userId: string): Promise<boolean> {
    const entry = await this.redis.get(`matchmaking:joined:${userId}`);
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
    const raw = await this.redis.get(`matchmaking:joined:${userId}`);
    if (!raw) return false;

    const entry = JSON.parse(raw) as QueueEntry;
    return Date.now() - entry.joinedAt >= MATCHMAKING_TIMEOUT_MS;
  }

  /**
   * Find a match for the given user.
   * Returns opponent info if found, null if no match yet.
   */
  async findMatch(userId: string, rating: number): Promise<MatchResult | null> {
    const raw = await this.redis.get(`matchmaking:joined:${userId}`);
    const waitTime = raw ? Date.now() - (JSON.parse(raw) as QueueEntry).joinedAt : 0;

    const ratingRange = this.calculateRatingRange(waitTime);
    const minRating = rating - ratingRange;
    const maxRating = rating + ratingRange;

    const candidates = await this.redis.zrangebyscore(
      MATCHMAKING_QUEUE_KEY,
      minRating,
      maxRating,
    );

    const opponents = candidates.filter((id) => id !== userId);

    if (opponents.length === 0) {
      return null;
    }

    // Pick the first (closest rated) opponent
    const opponentId = opponents[0]!;

    // Get opponent rating from their queue entry
    const opponentRaw = await this.redis.get(`matchmaking:joined:${opponentId}`);
    const opponentRating = opponentRaw ? (JSON.parse(opponentRaw) as QueueEntry).rating : 1000;

    // Remove both from queue
    await this.removeFromQueue(userId);
    await this.removeFromQueue(opponentId);

    this.logger.log(`Match found: ${userId} vs ${opponentId} (range: ±${ratingRange})`);

    return { opponentId, opponentRating };
  }

  /**
   * Get queue size for monitoring.
   */
  async getQueueSize(): Promise<number> {
    const all = await this.redis.zrangebyscore(MATCHMAKING_QUEUE_KEY, -Infinity, Infinity);
    return all.length;
  }
}
