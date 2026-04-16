import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import {
  FeedCardType,
  FeedInteractionType,
  DAILY_CARDS_TARGET,
  DAILY_CARDS_MIN,
  FEED_XP,
  SRS_INTERVALS,
  FIRE_STREAK_THRESHOLD,
  FEED_CACHE_TTL,
} from '@razum/shared';
import type { DailyFeedData, FeedCard, ArenaContent } from '@razum/shared';

// ── Internal types ─────────────────────────────

interface ForgeQueueItem {
  cardId: string;
  questionId: string;
  nextReviewDate: string; // YYYY-MM-DD
  attempt: number;
  campaignId?: string;
}

interface InteractInput {
  type: string;
  answerIndex?: number;
  timeTakenMs?: number;
}

export interface InteractResult {
  xpEarned: number;
  isCorrect?: boolean;
  feedStreak: number;
  todayViewedCount: number;
  addedToForge?: boolean;
  forgePromoted?: boolean;
}

export interface FeedStatsResult {
  feedStreak: number;
  todayViewedCount: number;
  totalFeedXp: number;
  isOnFire: boolean;
  todayTarget: number;
  todayRemaining: number;
}

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly feedAlgorithm: FeedAlgorithmService,
  ) {}

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  private todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private redisFeedKey(userId: string, date: string): string {
    return `feed:daily:${userId}:${date}`;
  }

  // ──────────────────────────────────────────────
  // getDailyFeed
  // ──────────────────────────────────────────────

  async getDailyFeed(userId: string): Promise<DailyFeedData> {
    const today = this.todayUTC();

    // 1. Check Redis cache first
    const cached = await this.redis.get(this.redisFeedKey(userId, today));
    if (cached) {
      return JSON.parse(cached) as DailyFeedData;
    }

    // 2. Get or create UserFeedState
    const feedState = await this.getOrCreateFeedState(userId);

    // 3. If todayCards are populated and lastFeedDate matches today → rebuild from DB state
    const existingCards = feedState.todayCards as FeedCard[] | null;
    if (
      existingCards &&
      Array.isArray(existingCards) &&
      existingCards.length > 0 &&
      feedState.lastFeedDate === today
    ) {
      const data = await this.buildFeedResponse(userId, feedState, existingCards);
      await this.redis.set(this.redisFeedKey(userId, today), JSON.stringify(data), FEED_CACHE_TTL);
      return data;
    }

    // 4. No active campaigns → return starter feed
    const activeCampaignIds = feedState.activeCampaignIds;
    if (!activeCampaignIds || activeCampaignIds.length === 0) {
      return this.buildStarterFeed(userId, feedState);
    }

    // 5. Generate new daily feed
    const cards = await this.generateDailyCards(userId, feedState, today);

    // 6. Save to DB and cache
    await this.prisma.userFeedState.update({
      where: { userId },
      data: {
        todayCards: cards as unknown as Parameters<typeof this.prisma.userFeedState.update>[0]['data']['todayCards'],
        lastFeedDate: today,
        todayViewedCount: 0,
      },
    });

    const updatedState = await this.prisma.userFeedState.findUniqueOrThrow({
      where: { userId },
    });

    const data = await this.buildFeedResponse(userId, updatedState, cards);
    await this.redis.set(this.redisFeedKey(userId, today), JSON.stringify(data), FEED_CACHE_TTL);

    return data;
  }

  // ──────────────────────────────────────────────
  // Feed generation (delegated to FeedAlgorithmService)
  // ──────────────────────────────────────────────

  private async generateDailyCards(
    userId: string,
    feedState: { activeCampaignIds: string[]; forgeQueue: unknown },
    today: string,
  ): Promise<FeedCard[]> {
    return this.feedAlgorithm.generateDailyFeed(userId, feedState, today);
  }

  // ──────────────────────────────────────────────
  // Build feed response
  // ──────────────────────────────────────────────

  private async buildFeedResponse(
    userId: string,
    feedState: {
      feedStreak: number;
      todayViewedCount: number;
      activeCampaignIds: string[];
    },
    cards: FeedCard[],
  ): Promise<DailyFeedData> {
    const today = this.todayUTC();

    // Fetch campaign progress for response
    const campaignProgress = await Promise.all(
      feedState.activeCampaignIds.map(async (campaignId) => {
        const [campaign, progress] = await Promise.all([
          this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { title: true, durationDays: true, branch: true },
          }),
          this.prisma.userCampaignProgress.findUnique({
            where: { userId_campaignId: { userId, campaignId } },
            select: { currentDay: true },
          }),
        ]);

        return {
          campaignId,
          campaignTitle: campaign?.title ?? 'Unknown',
          currentDay: progress?.currentDay ?? 1,
          totalDays: campaign?.durationDays ?? 0,
          branch: (campaign?.branch ?? 'STRATEGY') as DailyFeedData['campaignProgress'][number]['branch'],
        };
      }),
    );

    return {
      date: today,
      cards,
      totalCards: cards.length,
      viewedCards: feedState.todayViewedCount,
      campaignProgress,
      streak: {
        current: feedState.feedStreak,
        feedStreak: feedState.feedStreak,
        isOnFire: feedState.feedStreak >= FIRE_STREAK_THRESHOLD,
      },
    };
  }

  private async buildStarterFeed(
    userId: string,
    feedState: { feedStreak: number; todayViewedCount: number },
  ): Promise<DailyFeedData> {
    const today = this.todayUTC();

    // Return a minimal feed with a wisdom card and an arena card prompting campaign selection
    const starterCards: FeedCard[] = [
      this.feedAlgorithm.generateWisdomCard(),
      {
        id: `starter-arena-${Date.now()}`,
        type: FeedCardType.ARENA,
        content: {
          type: FeedCardType.ARENA,
          data: {
            message: 'Выбери кампанию, чтобы начать путь воина знаний!',
            branch: 'STRATEGY' as ArenaContent['branch'],
            conceptsLearned: 0,
            suggestedDifficulty: 'BRONZE' as ArenaContent['suggestedDifficulty'],
          },
        },
        branch: 'STRATEGY' as FeedCard['branch'],
      },
    ];

    return {
      date: today,
      cards: starterCards,
      totalCards: starterCards.length,
      viewedCards: feedState.todayViewedCount,
      campaignProgress: [],
      streak: {
        current: feedState.feedStreak,
        feedStreak: feedState.feedStreak,
        isOnFire: feedState.feedStreak >= FIRE_STREAK_THRESHOLD,
      },
    };
  }

  // ──────────────────────────────────────────────
  // interactWithCard
  // ──────────────────────────────────────────────

  async interactWithCard(
    userId: string,
    cardId: string,
    interaction: InteractInput,
  ): Promise<InteractResult> {
    const today = this.todayUTC();
    const interactionType = interaction.type as FeedInteractionType;

    // Determine if this is a generated card (wisdom/arena/forge) or a real campaign card
    const isGeneratedCard =
      cardId.startsWith('wisdom-') ||
      cardId.startsWith('arena-') ||
      cardId.startsWith('forge-') ||
      cardId.startsWith('sparring-') ||
      cardId.startsWith('starter-');

    // For real campaign cards, verify the card exists
    let campaignCard: { id: string; campaignId: string; type: string; content: unknown } | null = null;
    if (!isGeneratedCard) {
      campaignCard = await this.prisma.campaignCard.findUnique({
        where: { id: cardId },
        select: { id: true, campaignId: true, type: true, content: true },
      });

      if (!campaignCard) {
        throw new BadRequestException(`Card ${cardId} not found`);
      }
    }

    // 1. Calculate XP
    const xpEarned = this.calculateXp(interactionType, campaignCard?.type ?? this.inferCardType(cardId));
    const isCorrect = this.determineCorrectness(interactionType);

    // 2. Create FeedCardInteraction record (only for real campaign cards)
    if (campaignCard) {
      await this.prisma.feedCardInteraction.create({
        data: {
          userId,
          cardId: campaignCard.id,
          campaignId: campaignCard.campaignId,
          type: interaction.type,
          answerIndex: interaction.answerIndex ?? null,
          timeTakenMs: interaction.timeTakenMs ?? null,
          xpEarned,
        },
      });
    }

    // 3. Handle FORGE queue updates
    let addedToForge = false;
    let forgePromoted = false;

    const feedState = await this.getOrCreateFeedState(userId);
    const forgeQueue = (feedState.forgeQueue ?? []) as unknown as ForgeQueueItem[];

    if (
      (interactionType === FeedInteractionType.ANSWERED_WRONG) &&
      campaignCard &&
      (campaignCard.type === 'CHALLENGE' || campaignCard.type === 'SPARRING')
    ) {
      // Add to forge queue for SRS review
      const alreadyInQueue = forgeQueue.some((item) => item.cardId === campaignCard!.id);
      if (!alreadyInQueue) {
        const questionId =
          (campaignCard.content as Record<string, unknown> & { data?: { questionId?: string } })?.data?.questionId ?? campaignCard.id;

        forgeQueue.push({
          cardId: campaignCard.id,
          questionId: questionId as string,
          nextReviewDate: this.addDays(today, SRS_INTERVALS[0]),
          attempt: 1,
          campaignId: campaignCard.campaignId,
        });
        addedToForge = true;
      }
    }

    // Handle FORGE card correct answer → promote or remove from queue
    if (cardId.startsWith('forge-') && interactionType === FeedInteractionType.ANSWERED_CORRECT) {
      const originalCardId = cardId.replace(/^forge-/, '').replace(/-\d+$/, '');
      const itemIdx = forgeQueue.findIndex((item) => item.cardId === originalCardId);

      if (itemIdx !== -1) {
        const item = forgeQueue[itemIdx]!;
        const nextIntervalIdx = item.attempt; // attempt is 1-based, SRS_INTERVALS is 0-based

        if (nextIntervalIdx >= SRS_INTERVALS.length) {
          // Mastered — remove from queue
          forgeQueue.splice(itemIdx, 1);
          forgePromoted = true;
        } else {
          // Schedule next SRS review
          forgeQueue[itemIdx] = {
            ...item,
            nextReviewDate: this.addDays(today, SRS_INTERVALS[nextIntervalIdx]!),
            attempt: item.attempt + 1,
          };
          forgePromoted = true;
        }
      }
    }

    // Handle FORGE card wrong answer → reset to first interval
    if (cardId.startsWith('forge-') && interactionType === FeedInteractionType.ANSWERED_WRONG) {
      const originalCardId = cardId.replace(/^forge-/, '').replace(/-\d+$/, '');
      const itemIdx = forgeQueue.findIndex((item) => item.cardId === originalCardId);

      if (itemIdx !== -1) {
        forgeQueue[itemIdx] = {
          ...forgeQueue[itemIdx]!,
          nextReviewDate: this.addDays(today, SRS_INTERVALS[0]!),
          attempt: 1, // Reset to beginning
        };
      }
    }

    // 4. Update todayViewedCount and forgeQueue
    const newViewedCount = feedState.todayViewedCount + 1;

    // 5. Update feed streak: if viewed >= DAILY_CARDS_MIN and last date was yesterday or not set
    let newStreak = feedState.feedStreak;
    if (newViewedCount >= DAILY_CARDS_MIN && feedState.lastFeedDate !== today) {
      // This is the first time today reaching the minimum
      const yesterday = this.addDays(today, -1);
      if (feedState.lastFeedDate === yesterday) {
        newStreak = feedState.feedStreak + 1;
      } else if (!feedState.lastFeedDate) {
        newStreak = 1;
      } else {
        newStreak = 1; // Streak broken
      }
    }

    await this.prisma.userFeedState.update({
      where: { userId },
      data: {
        todayViewedCount: newViewedCount,
        forgeQueue: forgeQueue as unknown as Parameters<typeof this.prisma.userFeedState.update>[0]['data']['forgeQueue'],
        feedStreak: newStreak,
        lastFeedDate: today,
      },
    });

    // 6. Add to campaign progress completedCardIds
    if (campaignCard) {
      await this.prisma.userCampaignProgress.update({
        where: {
          userId_campaignId: { userId, campaignId: campaignCard.campaignId },
        },
        data: {
          completedCardIds: {
            push: campaignCard.id,
          },
          lastActiveDate: today,
        },
      });

      // Check if all cards for current day are complete → advance to next day
      await this.maybeAdvanceCampaignDay(userId, campaignCard.campaignId);
    }

    // 7. Invalidate Redis cache so next getDailyFeed picks up changes
    await this.redis.del(this.redisFeedKey(userId, today));

    return {
      xpEarned,
      isCorrect,
      feedStreak: newStreak,
      todayViewedCount: newViewedCount,
      addedToForge: addedToForge || undefined,
      forgePromoted: forgePromoted || undefined,
    };
  }

  // ──────────────────────────────────────────────
  // getFeedStats
  // ──────────────────────────────────────────────

  async getFeedStats(userId: string): Promise<FeedStatsResult> {
    const feedState = await this.getOrCreateFeedState(userId);

    // Total XP from all feed interactions
    const xpAgg = await this.prisma.feedCardInteraction.aggregate({
      where: { userId },
      _sum: { xpEarned: true },
    });

    const totalFeedXp = xpAgg._sum.xpEarned ?? 0;
    const todayRemaining = Math.max(0, DAILY_CARDS_TARGET - feedState.todayViewedCount);

    return {
      feedStreak: feedState.feedStreak,
      todayViewedCount: feedState.todayViewedCount,
      totalFeedXp,
      isOnFire: feedState.feedStreak >= FIRE_STREAK_THRESHOLD,
      todayTarget: DAILY_CARDS_TARGET,
      todayRemaining,
    };
  }

  // ──────────────────────────────────────────────
  // Campaign day advancement
  // ──────────────────────────────────────────────

  private async maybeAdvanceCampaignDay(userId: string, campaignId: string): Promise<void> {
    const progress = await this.prisma.userCampaignProgress.findUnique({
      where: { userId_campaignId: { userId, campaignId } },
    });

    if (!progress) return;

    const completedForDay = new Set(progress.completedCardIds);
    const dayCards = await this.prisma.campaignCard.findMany({
      where: {
        campaignId,
        dayNumber: progress.currentDay,
      },
      select: { id: true },
    });

    const allDayComplete = dayCards.every((c) => completedForDay.has(c.id));

    if (allDayComplete && dayCards.length > 0) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { durationDays: true },
      });

      const nextDay = progress.currentDay + 1;

      if (campaign && nextDay > campaign.durationDays) {
        // Campaign complete!
        await this.prisma.userCampaignProgress.update({
          where: { userId_campaignId: { userId, campaignId } },
          data: { completedAt: new Date() },
        });

        this.logger.log(`User ${userId} completed campaign ${campaignId}`);
      } else {
        // Advance to next day
        await this.prisma.userCampaignProgress.update({
          where: { userId_campaignId: { userId, campaignId } },
          data: { currentDay: nextDay },
        });

        this.logger.log(`User ${userId} advanced to day ${nextDay} in campaign ${campaignId}`);
      }
    }
  }

  // ──────────────────────────────────────────────
  // XP calculation
  // ──────────────────────────────────────────────

  private calculateXp(interactionType: FeedInteractionType, cardType: string): number {
    switch (interactionType) {
      case FeedInteractionType.VIEWED:
        if (cardType === 'INSIGHT') return FEED_XP.INSIGHT_VIEWED;
        if (cardType === 'WISDOM') return FEED_XP.WISDOM_VIEWED;
        return FEED_XP.WISDOM_VIEWED; // Default for view-only cards

      case FeedInteractionType.ANSWERED_CORRECT:
        if (cardType === 'CHALLENGE') return FEED_XP.CHALLENGE_CORRECT;
        if (cardType === 'SPARRING') return FEED_XP.SPARRING_WIN;
        if (cardType === 'FORGE') return FEED_XP.FORGE_CORRECT;
        if (cardType === 'CASE') return FEED_XP.CASE_COMPLETED;
        return FEED_XP.CHALLENGE_CORRECT;

      case FeedInteractionType.ANSWERED_WRONG:
        if (cardType === 'CHALLENGE') return FEED_XP.CHALLENGE_WRONG;
        if (cardType === 'SPARRING') return FEED_XP.SPARRING_LOSS;
        if (cardType === 'FORGE') return FEED_XP.FORGE_WRONG;
        return FEED_XP.CHALLENGE_WRONG;

      case FeedInteractionType.SKIPPED:
        return 0;

      case FeedInteractionType.ARENA_CLICKED:
        return 0; // XP earned from the actual battle, not the click

      default:
        return 0;
    }
  }

  private determineCorrectness(interactionType: FeedInteractionType): boolean | undefined {
    switch (interactionType) {
      case FeedInteractionType.ANSWERED_CORRECT:
        return true;
      case FeedInteractionType.ANSWERED_WRONG:
        return false;
      default:
        return undefined;
    }
  }

  private inferCardType(cardId: string): string {
    if (cardId.startsWith('wisdom-')) return 'WISDOM';
    if (cardId.startsWith('arena-') || cardId.startsWith('starter-')) return 'ARENA';
    if (cardId.startsWith('forge-')) return 'FORGE';
    if (cardId.startsWith('sparring-')) return 'SPARRING';
    return 'INSIGHT';
  }

  // ──────────────────────────────────────────────
  // UserFeedState management
  // ──────────────────────────────────────────────

  private async getOrCreateFeedState(userId: string) {
    return this.prisma.userFeedState.upsert({
      where: { userId },
      create: {
        userId,
        activeCampaignIds: [],
        todayCards: [],
        forgeQueue: [],
        feedStreak: 0,
        lastFeedDate: null,
        todayViewedCount: 0,
      },
      update: {},
    });
  }

  // ──────────────────────────────────────────────
  // Date helpers
  // ──────────────────────────────────────────────

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
