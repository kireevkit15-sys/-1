import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const MATCHMAKING_QUEUE_KEY = 'matchmaking:queue';
const DEFAULT_RATING_RANGE = 200;
const MAX_RATING_RANGE = 500;

interface MatchResult {
  opponentId: string;
  rating: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(private readonly redis: RedisService) {}

  async addToQueue(userId: string, rating: number): Promise<void> {
    await this.redis.zadd(MATCHMAKING_QUEUE_KEY, rating, userId);
    // Store queue entry timestamp for expanding search range
    await this.redis.set(
      `matchmaking:joined:${userId}`,
      String(Date.now()),
      120, // 2 minute TTL
    );
    this.logger.log(`User ${userId} added to matchmaking queue (rating: ${rating})`);
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.redis.zrem(MATCHMAKING_QUEUE_KEY, userId);
    await this.redis.del(`matchmaking:joined:${userId}`);
    this.logger.log(`User ${userId} removed from matchmaking queue`);
  }

  async findMatch(
    userId: string,
    rating: number,
  ): Promise<MatchResult | null> {
    // Calculate how long the user has been in the queue to expand range
    const joinedAt = await this.redis.get(`matchmaking:joined:${userId}`);
    const waitTime = joinedAt ? Date.now() - parseInt(joinedAt, 10) : 0;

    // Expand rating range over time: start at DEFAULT, grow to MAX
    const ratingRange = Math.min(
      DEFAULT_RATING_RANGE + Math.floor(waitTime / 10000) * 50,
      MAX_RATING_RANGE,
    );

    const minRating = rating - ratingRange;
    const maxRating = rating + ratingRange;

    // Find potential opponents within rating range
    const candidates = await this.redis.zrangebyscore(
      MATCHMAKING_QUEUE_KEY,
      minRating,
      maxRating,
    );

    // Filter out the current user
    const opponents = candidates.filter((id) => id !== userId);

    if (opponents.length === 0) {
      return null;
    }

    // Pick the closest-rated opponent
    // For simplicity, take the first one (already sorted by score/rating)
    const opponentId = opponents[0]!;

    // Remove both players from queue
    await this.removeFromQueue(userId);
    await this.removeFromQueue(opponentId);

    this.logger.log(
      `Match found: ${userId} vs ${opponentId} (range: ${ratingRange})`,
    );

    return {
      opponentId,
      rating: 0, // Actual rating can be fetched from DB if needed
    };
  }
}
