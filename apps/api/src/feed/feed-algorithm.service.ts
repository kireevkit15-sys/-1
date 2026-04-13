import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FeedCardType,
  DAILY_CARDS_TARGET,
  MAX_DAILY_FORGE_CARDS,
  ARENA_INTERVAL,
  WISDOM_INTERVAL,
  SRS_INTERVALS,
  ADAPTIVE,
} from '@razum/shared';
import type {
  FeedCard,
  WisdomContent,
  ArenaContent,
  SparringContent,
} from '@razum/shared';

// ── Internal types ─────────────────────────────

interface ForgeQueueItem {
  cardId: string;
  questionId: string;
  nextReviewDate: string; // YYYY-MM-DD
  attempt: number;
  campaignId?: string;
}

interface FeedStateInput {
  activeCampaignIds: string[];
  forgeQueue: unknown;
}

interface UserAccuracyProfile {
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  /** 'easy' = accuracy < EASY_THRESHOLD, 'hard' = accuracy > HARD_THRESHOLD, 'normal' otherwise */
  difficultyBand: 'easy' | 'normal' | 'hard';
}

// ── Placeholder wisdom quotes ──────────────────

const WISDOM_POOL: WisdomContent[] = [
  {
    quote: 'Познай самого себя.',
    author: 'Сократ',
    authorTitle: 'Древнегреческий философ',
    context: 'Самопознание — фундамент всей стратегии. Невозможно победить, не зная собственных сильных и слабых сторон.',
  },
  {
    quote: 'Война — это путь обмана.',
    author: 'Сунь-Цзы',
    authorTitle: 'Древнекитайский стратег',
    context: 'Стратегическое мышление начинается с понимания: то, что кажется очевидным, часто — ловушка.',
  },
  {
    quote: 'Я знаю, что ничего не знаю.',
    author: 'Сократ',
    authorTitle: 'Древнегреческий философ',
    context: 'Интеллектуальная скромность — суперсила. Тот, кто признаёт пробелы, быстрее учится.',
  },
  {
    quote: 'Удача — это подготовка, встретившая возможность.',
    author: 'Сенека',
    authorTitle: 'Римский стоик',
    context: 'Каждая карточка — это подготовка. Каждый бой — это возможность.',
  },
  {
    quote: 'Целое больше суммы его частей.',
    author: 'Аристотель',
    authorTitle: 'Древнегреческий философ',
    context: 'Знания из разных веток объединяются в систему мышления, которая сильнее каждого фрагмента.',
  },
  {
    quote: 'Кто владеет информацией — тот владеет миром.',
    author: 'Натан Ротшильд',
    authorTitle: 'Финансист',
    context: 'Эрудиция — не хобби, а стратегическое преимущество в реальном мире.',
  },
  {
    quote: 'Логика — начало мудрости, а не её конец.',
    author: 'Спок',
    authorTitle: 'Вулканская логика',
    context: 'Логика даёт фундамент, но настоящая мудрость — в умении выйти за её рамки.',
  },
  {
    quote: 'Сильнейшее оружие — слово.',
    author: 'Цицерон',
    authorTitle: 'Римский оратор',
    context: 'Риторика превращает знания в силу убеждения. Знать — мало, надо уметь донести.',
  },
];

/**
 * FeedAlgorithmService — the brain of the daily feed.
 *
 * Responsibilities:
 *   1. Fetch campaign cards for today's day from active campaigns
 *   2. Pull due items from the SRS forge queue (spaced repetition)
 *   3. Generate SPARRING ghost cards from recent battle data
 *   4. Interleave all sources for variety (alternating campaigns, periodic WISDOM/ARENA)
 *   5. Adapt difficulty based on the user's recent accuracy profile
 *
 * The algorithm produces an ordered array of FeedCard[] ready for consumption.
 */
@Injectable()
export class FeedAlgorithmService {
  private readonly logger = new Logger(FeedAlgorithmService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Generate a full daily feed for the user.
   *
   * Algorithm:
   *   1. Get active campaigns → fetch CampaignCards for currentDay
   *   2. Get forgeQueue → filter by SRS intervals (due today)
   *   3. Create SPARRING cards from recent battle data (async ghosts)
   *   4. Interleave cards:
   *      - Alternate between campaigns if 2 are active
   *      - Insert WISDOM every WISDOM_INTERVAL (4) cards
   *      - Insert ARENA every ARENA_INTERVAL (6) cards
   *      - Mix in FORGE cards naturally between content cards
   *   5. Adapt difficulty based on recent accuracy:
   *      - <60% correct → prioritize INSIGHT, fewer CHALLENGE
   *      - >80% correct → more CHALLENGE, CASE, harder questions
   *   6. Return ordered card array capped at DAILY_CARDS_TARGET
   */
  async generateDailyFeed(
    userId: string,
    feedState: FeedStateInput,
    today: string,
  ): Promise<FeedCard[]> {
    // ── Step 1: Gather campaign cards by bucket ──
    const campaignCardBuckets = await this.fetchCampaignCards(userId, feedState.activeCampaignIds);

    // ── Step 2: Collect due FORGE cards from SRS queue ──
    const forgeCards = await this.buildForgeCards(feedState.forgeQueue, today);

    // ── Step 3: Create SPARRING ghost cards from recent battles ──
    const sparringCards = await this.buildSparringCards(userId);

    // ── Step 4: Get user accuracy profile for adaptive difficulty ──
    const accuracy = await this.getUserAccuracyProfile(userId);

    // ── Step 5: Apply adaptive difficulty filtering ──
    const adaptedBuckets = this.applyAdaptiveDifficulty(campaignCardBuckets, accuracy);

    // ── Step 6: Interleave all card sources ──
    const baseCards = this.interleaveAllSources(adaptedBuckets, forgeCards, sparringCards);

    // ── Step 7: Insert periodic WISDOM and ARENA cards ──
    const withWisdom = this.insertPeriodicCards(
      baseCards,
      WISDOM_INTERVAL,
      () => this.generateWisdomCard(),
    );

    const withArena = this.insertPeriodicCards(
      withWisdom,
      ARENA_INTERVAL,
      (idx) => this.generateArenaCard(idx, feedState.activeCampaignIds),
    );

    // ── Step 8: Cap at daily target ──
    const finalFeed = withArena.slice(0, DAILY_CARDS_TARGET + 5); // allow slight overflow for WISDOM/ARENA

    this.logger.log(
      `Generated feed for user ${userId}: ${finalFeed.length} cards ` +
      `(${adaptedBuckets.reduce((s, b) => s + b.length, 0)} campaign, ` +
      `${forgeCards.length} forge, ${sparringCards.length} sparring, ` +
      `accuracy=${(accuracy.accuracy * 100).toFixed(0)}% [${accuracy.difficultyBand}])`,
    );

    return finalFeed;
  }

  // ──────────────────────────────────────────────
  // Step 1: Fetch campaign cards
  // ──────────────────────────────────────────────

  /**
   * For each active campaign, fetch the CampaignCards for the user's current day,
   * excluding cards already completed. Returns one bucket per campaign.
   */
  private async fetchCampaignCards(
    userId: string,
    activeCampaignIds: string[],
  ): Promise<FeedCard[][]> {
    const buckets: FeedCard[][] = [];

    for (const campaignId of activeCampaignIds) {
      const progress = await this.prisma.userCampaignProgress.findUnique({
        where: {
          userId_campaignId: { userId, campaignId },
        },
      });

      const currentDay = progress?.currentDay ?? 1;

      const dbCards = await this.prisma.campaignCard.findMany({
        where: {
          campaignId,
          dayNumber: currentDay,
        },
        orderBy: { orderInDay: 'asc' },
        include: { campaign: { select: { title: true, branch: true } } },
      });

      // Filter out already completed cards
      const completedIds = new Set(progress?.completedCardIds ?? []);
      const bucket: FeedCard[] = dbCards
        .filter((c) => !completedIds.has(c.id))
        .map((c) => ({
          id: c.id,
          type: c.type as FeedCardType,
          content: c.content as FeedCard['content'],
          branch: c.branch as FeedCard['branch'],
          campaignId: c.campaignId,
          dayNumber: c.dayNumber,
          orderInDay: c.orderInDay,
        }));

      if (bucket.length > 0) {
        buckets.push(bucket);
      }
    }

    return buckets;
  }

  // ──────────────────────────────────────────────
  // Step 2: Build FORGE cards (Spaced Repetition)
  // ──────────────────────────────────────────────

  /**
   * Filter the forge queue to find items due for review today (SRS).
   * SRS_INTERVALS = [1, 3, 7, 14, 30] days — each correct answer
   * promotes the item to the next interval; wrong resets to interval[0].
   */
  private async buildForgeCards(
    forgeQueueRaw: unknown,
    today: string,
  ): Promise<FeedCard[]> {
    const forgeQueue = (forgeQueueRaw ?? []) as ForgeQueueItem[];

    // Only include items whose nextReviewDate <= today
    const dueItems = forgeQueue
      .filter((item) => item.nextReviewDate <= today)
      .slice(0, MAX_DAILY_FORGE_CARDS);

    const forgeCards: FeedCard[] = [];

    for (const forgeItem of dueItems) {
      const originalCard = await this.prisma.campaignCard.findUnique({
        where: { id: forgeItem.cardId },
      });

      if (!originalCard) continue;

      const content = originalCard.content as Record<string, unknown> & {
        data?: {
          text?: string;
          options?: string[];
          correctIndex?: number;
          explanation?: string;
        };
      };

      forgeCards.push({
        id: `forge-${forgeItem.cardId}-${forgeItem.attempt}`,
        type: FeedCardType.FORGE,
        content: {
          type: FeedCardType.FORGE,
          data: {
            originalCardId: forgeItem.cardId,
            questionId: forgeItem.questionId,
            text: content?.data?.text ?? '',
            options: (content?.data?.options ?? []) as string[],
            correctIndex: (content?.data?.correctIndex ?? 0) as number,
            explanation: (content?.data?.explanation ?? '') as string,
            failedAt: forgeItem.nextReviewDate,
            attempt: forgeItem.attempt,
          },
        },
        branch: originalCard.branch as FeedCard['branch'],
        campaignId: forgeItem.campaignId,
      });
    }

    return forgeCards;
  }

  // ──────────────────────────────────────────────
  // Step 3: Build SPARRING cards (Async Ghosts)
  // ──────────────────────────────────────────────

  /**
   * Create SPARRING cards from recent battle data.
   * A "ghost" is an opponent's question+answer from a past battle,
   * replayed as a 1-question mini-challenge. The user competes against
   * the ghost's recorded time and correctness.
   *
   * Sources up to 3 recent battles where the opponent answered questions.
   */
  private async buildSparringCards(userId: string): Promise<FeedCard[]> {
    const sparringCards: FeedCard[] = [];

    try {
      // Find recent battles where this user participated
      const recentBattles = await this.prisma.battle.findMany({
        where: {
          OR: [
            { challengerId: userId },
            { opponentId: userId },
          ],
          status: 'FINISHED',
        },
        orderBy: { finishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          challengerId: true,
          opponentId: true,
          challenger: { select: { username: true } },
          opponent: { select: { username: true } },
        },
      });

      // For each battle, try to find a question + opponent answer to ghost
      for (const battle of recentBattles) {
        if (sparringCards.length >= 3) break;

        const opponentId = battle.challengerId === userId
          ? battle.opponentId
          : battle.challengerId;
        const opponentName = battle.challengerId === userId
          ? battle.opponent?.username
          : battle.challenger?.username;

        if (!opponentId || !opponentName) continue;

        // Get a round from this battle with a question
        const round = await this.prisma.battleRound.findFirst({
          where: { battleId: battle.id },
          include: {
            question: {
              select: {
                id: true,
                text: true,
                options: true,
                correctIndex: true,
                explanation: true,
                branch: true,
              },
            },
          },
          orderBy: { roundNumber: 'desc' },
        });

        if (!round?.question) continue;

        // Determine opponent's answer performance
        const opponentAnswer = battle.challengerId === userId
          ? round.opponentAnswer
          : round.challengerAnswer;
        const opponentTime = battle.challengerId === userId
          ? round.opponentTimeMs
          : round.challengerTimeMs;

        const sparringContent: SparringContent = {
          questionId: round.question.id,
          text: round.question.text,
          options: round.question.options as string[],
          correctIndex: round.question.correctIndex,
          explanation: round.question.explanation ?? '',
          opponentName,
          opponentTimeMs: opponentTime ?? 5000,
          opponentCorrect: opponentAnswer === round.question.correctIndex,
        };

        sparringCards.push({
          id: `sparring-${battle.id}-${round.id}`,
          type: FeedCardType.SPARRING,
          content: {
            type: FeedCardType.SPARRING,
            data: sparringContent,
          },
          branch: (round.question.branch ?? 'STRATEGY') as FeedCard['branch'],
        });
      }
    } catch (error) {
      // Sparring is optional — if battle tables don't exist yet or query fails,
      // just return an empty array and log the issue
      this.logger.warn(`Failed to build sparring cards for user ${userId}: ${error}`);
    }

    return sparringCards;
  }

  // ──────────────────────────────────────────────
  // Step 4: Adaptive difficulty
  // ──────────────────────────────────────────────

  /**
   * Calculate the user's recent accuracy profile from the last 50 feed interactions.
   *
   * Returns:
   *   - accuracy: 0.0..1.0 ratio of correct to total answered
   *   - difficultyBand:
   *     - 'easy'   if accuracy < ADAPTIVE.EASY_THRESHOLD (60%) → user is struggling
   *     - 'hard'   if accuracy > ADAPTIVE.HARD_THRESHOLD (80%) → user is cruising
   *     - 'normal' otherwise → balanced challenge
   */
  private async getUserAccuracyProfile(userId: string): Promise<UserAccuracyProfile> {
    const recentInteractions = await this.prisma.feedCardInteraction.findMany({
      where: {
        userId,
        type: {
          in: ['ANSWERED_CORRECT', 'ANSWERED_WRONG'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { type: true },
    });

    const totalAnswered = recentInteractions.length;
    if (totalAnswered === 0) {
      return { totalAnswered: 0, totalCorrect: 0, accuracy: 0.7, difficultyBand: 'normal' };
    }

    const totalCorrect = recentInteractions.filter((i) => i.type === 'ANSWERED_CORRECT').length;
    const accuracy = totalCorrect / totalAnswered;

    let difficultyBand: UserAccuracyProfile['difficultyBand'] = 'normal';
    if (accuracy < ADAPTIVE.EASY_THRESHOLD) {
      difficultyBand = 'easy';
    } else if (accuracy > ADAPTIVE.HARD_THRESHOLD) {
      difficultyBand = 'hard';
    }

    return { totalAnswered, totalCorrect, accuracy, difficultyBand };
  }

  /**
   * Apply adaptive difficulty to campaign card buckets.
   *
   * Strategy:
   *   - 'easy' band (user struggling, <60% accuracy):
   *     Prioritize INSIGHT cards (passive learning), reduce CHALLENGE/CASE density.
   *     Reorder so INSIGHTs come first, giving the user more knowledge before testing.
   *
   *   - 'hard' band (user cruising, >80% accuracy):
   *     Prioritize CHALLENGE and CASE cards (active testing), move INSIGHTs later.
   *     The user already understands the material — push them with harder content.
   *
   *   - 'normal' band: Keep original campaign ordering (designed by content team).
   */
  private applyAdaptiveDifficulty(
    buckets: FeedCard[][],
    accuracy: UserAccuracyProfile,
  ): FeedCard[][] {
    if (accuracy.difficultyBand === 'normal') {
      return buckets; // Trust the content team's ordering
    }

    return buckets.map((bucket) => {
      const sorted = [...bucket];

      if (accuracy.difficultyBand === 'easy') {
        // Struggling user: INSIGHT first, then CHALLENGE/CASE last
        sorted.sort((a, b) => {
          const priority = (type: FeedCardType): number => {
            switch (type) {
              case FeedCardType.INSIGHT: return 0;  // Show first — build understanding
              case FeedCardType.WISDOM: return 1;
              case FeedCardType.CHALLENGE: return 2; // Defer testing
              case FeedCardType.CASE: return 3;      // Hardest — show last
              default: return 1;
            }
          };
          return priority(a.type) - priority(b.type);
        });
      } else {
        // Cruising user: CHALLENGE/CASE first, INSIGHT later
        sorted.sort((a, b) => {
          const priority = (type: FeedCardType): number => {
            switch (type) {
              case FeedCardType.CASE: return 0;      // Hardest first
              case FeedCardType.CHALLENGE: return 1;  // Active testing
              case FeedCardType.SPARRING: return 2;
              case FeedCardType.INSIGHT: return 3;    // They already know this
              default: return 2;
            }
          };
          return priority(a.type) - priority(b.type);
        });
      }

      return sorted;
    });
  }

  // ──────────────────────────────────────────────
  // Step 5: Interleaving
  // ──────────────────────────────────────────────

  /**
   * Merge all card sources into a single interleaved stream.
   *
   * Strategy:
   *   1. Round-robin interleave campaign buckets (if 2 active: A, B, A, B...)
   *   2. Mix FORGE cards naturally — insert one after every 3-4 campaign cards
   *   3. Append SPARRING cards toward the middle/end of the feed
   *      (user should learn first, then spar)
   */
  private interleaveAllSources(
    campaignBuckets: FeedCard[][],
    forgeCards: FeedCard[],
    sparringCards: FeedCard[],
  ): FeedCard[] {
    // 1. Interleave campaign buckets via round-robin
    const interleaved = this.interleaveBuckets(campaignBuckets);

    // 2. Mix FORGE cards into the stream at regular intervals
    const withForge = this.mixCardsAtInterval(interleaved, forgeCards, 4);

    // 3. Insert SPARRING cards in the second half of the feed
    //    (user should study before sparring)
    const insertPoint = Math.max(Math.floor(withForge.length * 0.4), 3);
    const result = [...withForge];

    for (let i = 0; i < sparringCards.length; i++) {
      const position = Math.min(insertPoint + i * 3, result.length);
      result.splice(position, 0, sparringCards[i]);
    }

    return result;
  }

  /**
   * Round-robin interleave multiple card buckets for variety.
   * If 2 campaigns are active, alternates: camp1, camp2, camp1, camp2...
   */
  private interleaveBuckets(buckets: FeedCard[][]): FeedCard[] {
    if (buckets.length === 0) return [];
    if (buckets.length === 1) return buckets[0];

    const result: FeedCard[] = [];
    const iterators = buckets.map((b) => ({ cards: b, idx: 0 }));
    let remaining = true;

    while (remaining) {
      remaining = false;
      for (const iter of iterators) {
        if (iter.idx < iter.cards.length) {
          result.push(iter.cards[iter.idx]);
          iter.idx++;
          remaining = true;
        }
      }
    }

    return result;
  }

  /**
   * Insert cards from `extras` into `base` at regular intervals.
   * E.g., insert one forge card after every `interval` base cards.
   */
  private mixCardsAtInterval(
    base: FeedCard[],
    extras: FeedCard[],
    interval: number,
  ): FeedCard[] {
    if (extras.length === 0) return base;

    const result: FeedCard[] = [];
    let extraIdx = 0;
    let contentCount = 0;

    for (const card of base) {
      result.push(card);
      contentCount++;

      if (contentCount % interval === 0 && extraIdx < extras.length) {
        result.push(extras[extraIdx]);
        extraIdx++;
      }
    }

    // Append any remaining extras at the end
    while (extraIdx < extras.length) {
      result.push(extras[extraIdx]);
      extraIdx++;
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // Periodic card insertion (WISDOM / ARENA)
  // ──────────────────────────────────────────────

  /**
   * Insert generated cards at regular intervals.
   * E.g., a WISDOM card every 4th position, ARENA every 6th.
   */
  private insertPeriodicCards(
    cards: FeedCard[],
    interval: number,
    factory: (index: number) => FeedCard,
  ): FeedCard[] {
    if (cards.length === 0) return cards;

    const result: FeedCard[] = [];
    let contentCount = 0;

    for (const card of cards) {
      contentCount++;
      result.push(card);

      if (contentCount % interval === 0) {
        result.push(factory(contentCount));
      }
    }

    return result;
  }

  // ──────────────────────────────────────────────
  // Card generators
  // ──────────────────────────────────────────────

  generateWisdomCard(): FeedCard {
    const wisdom = WISDOM_POOL[Math.floor(Math.random() * WISDOM_POOL.length)];
    return {
      id: `wisdom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: FeedCardType.WISDOM,
      content: {
        type: FeedCardType.WISDOM,
        data: wisdom,
      },
      branch: 'STRATEGY' as FeedCard['branch'],
    };
  }

  generateArenaCard(index: number, campaignIds: string[]): FeedCard {
    const arenaData: ArenaContent = {
      message: `Ты изучил ${index} карточек — готов к битве?`,
      branch: 'STRATEGY' as ArenaContent['branch'],
      conceptsLearned: index,
      suggestedDifficulty: 'BRONZE' as ArenaContent['suggestedDifficulty'],
    };

    return {
      id: `arena-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: FeedCardType.ARENA,
      content: {
        type: FeedCardType.ARENA,
        data: arenaData,
      },
      branch: 'STRATEGY' as FeedCard['branch'],
    };
  }
}
