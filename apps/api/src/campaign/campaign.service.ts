import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Branch } from '@prisma/client';

const MAX_ACTIVE_CAMPAIGNS = 2;

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List campaigns with user progress and unlock status.
   * A campaign is unlocked if all prerequisiteCampaignIds are completed
   * by the user OR if prerequisiteCampaignIds is empty.
   */
  async getCampaigns(userId: string, branch?: Branch) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        isActive: true,
        ...(branch ? { branch } : {}),
      },
      orderBy: [{ branch: 'asc' }, { orderIndex: 'asc' }],
      include: {
        _count: { select: { cards: true } },
      },
    });

    // Get all user progress in one query
    const userProgress = await this.prisma.userCampaignProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map(
      userProgress.map((p) => [p.campaignId, p]),
    );

    // Collect completed campaign IDs for unlock checks
    const completedCampaignIds = new Set(
      userProgress
        .filter((p) => p.completedAt !== null)
        .map((p) => p.campaignId),
    );

    return campaigns.map((campaign) => {
      const progress = progressMap.get(campaign.id);

      const isUnlocked =
        campaign.prerequisiteCampaignIds.length === 0 ||
        campaign.prerequisiteCampaignIds.every((id) =>
          completedCampaignIds.has(id),
        );

      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        branch: campaign.branch,
        rank: campaign.rank,
        durationDays: campaign.durationDays,
        orderIndex: campaign.orderIndex,
        isUnlocked,
        isStarted: progress !== undefined,
        isCompleted: progress?.completedAt !== null && progress?.completedAt !== undefined,
        currentDay: progress?.currentDay ?? null,
        totalCards: campaign._count.cards,
      };
    });
  }

  /**
   * Get full campaign detail with cards for the current day.
   * Throws NotFoundException if campaign doesn't exist.
   * Throws ForbiddenException if campaign is locked.
   */
  async getCampaignById(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        cards: {
          orderBy: [{ dayNumber: 'asc' }, { orderInDay: 'asc' }],
        },
        _count: { select: { cards: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check unlock status
    const isUnlocked = await this.isCampaignUnlocked(userId, campaign.prerequisiteCampaignIds);
    if (!isUnlocked) {
      throw new ForbiddenException('Campaign is locked. Complete prerequisite campaigns first.');
    }

    // Get user progress
    const progress = await this.prisma.userCampaignProgress.findUnique({
      where: {
        userId_campaignId: { userId, campaignId },
      },
    });

    const currentDay = progress?.currentDay ?? 1;

    // Get cards for the current day
    const currentDayCards = campaign.cards.filter(
      (card) => card.dayNumber === currentDay,
    );

    // Build day-by-day summary
    const dayNumbers = [...new Set(campaign.cards.map((c) => c.dayNumber))].sort(
      (a, b) => a - b,
    );

    const days = dayNumbers.map((dayNum) => {
      const dayCards = campaign.cards.filter((c) => c.dayNumber === dayNum);
      return {
        dayNumber: dayNum,
        totalCards: dayCards.length,
        isCurrentDay: dayNum === currentDay,
        isCompleted: progress
          ? dayCards.every((card) =>
              progress.completedCardIds.includes(card.id),
            )
          : false,
      };
    });

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      branch: campaign.branch,
      rank: campaign.rank,
      durationDays: campaign.durationDays,
      totalCards: campaign._count.cards,
      isStarted: progress !== undefined && progress !== null,
      isCompleted: progress?.completedAt !== null && progress?.completedAt !== undefined,
      currentDay,
      streak: progress?.streak ?? 0,
      startedAt: progress?.startedAt ?? null,
      completedAt: progress?.completedAt ?? null,
      completedCardIds: progress?.completedCardIds ?? [],
      days,
      currentDayCards: currentDayCards.map((card) => ({
        id: card.id,
        dayNumber: card.dayNumber,
        orderInDay: card.orderInDay,
        type: card.type,
        content: card.content,
        branch: card.branch,
        questionId: card.questionId,
        statPrimary: card.statPrimary,
        isCompleted: progress
          ? progress.completedCardIds.includes(card.id)
          : false,
      })),
    };
  }

  /**
   * Start a campaign.
   * Checks: max 2 active campaigns, campaign not already started, campaign unlocked.
   */
  async startCampaign(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check unlock status
    const isUnlocked = await this.isCampaignUnlocked(userId, campaign.prerequisiteCampaignIds);
    if (!isUnlocked) {
      throw new ForbiddenException('Campaign is locked. Complete prerequisite campaigns first.');
    }

    // Check if already started
    const existingProgress = await this.prisma.userCampaignProgress.findUnique({
      where: {
        userId_campaignId: { userId, campaignId },
      },
    });

    if (existingProgress) {
      throw new BadRequestException('Campaign already started');
    }

    // Check active campaign limit via UserFeedState
    const feedState = await this.prisma.userFeedState.findUnique({
      where: { userId },
    });

    const activeCampaignIds = feedState?.activeCampaignIds ?? [];

    if (activeCampaignIds.length >= MAX_ACTIVE_CAMPAIGNS) {
      throw new BadRequestException(
        `Maximum ${MAX_ACTIVE_CAMPAIGNS} active campaigns allowed. Complete or abandon an existing campaign first.`,
      );
    }

    // Create progress and update feed state in a transaction
    const [progress] = await this.prisma.$transaction([
      this.prisma.userCampaignProgress.create({
        data: {
          userId,
          campaignId,
          currentDay: 1,
          completedCardIds: [],
          streak: 0,
        },
      }),
      this.prisma.userFeedState.upsert({
        where: { userId },
        create: {
          userId,
          activeCampaignIds: [campaignId],
        },
        update: {
          activeCampaignIds: [...activeCampaignIds, campaignId],
        },
      }),
    ]);

    this.logger.log(`User ${userId} started campaign ${campaignId}`);

    return {
      campaignId,
      currentDay: progress.currentDay,
      startedAt: progress.startedAt,
      message: 'Campaign started successfully',
    };
  }

  /**
   * Get user's active (in-progress, not completed) campaigns with progress details.
   */
  async getActiveCampaigns(userId: string) {
    const activeProgress = await this.prisma.userCampaignProgress.findMany({
      where: {
        userId,
        completedAt: null,
      },
      include: {
        campaign: {
          include: {
            _count: { select: { cards: true } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return activeProgress.map((progress) => ({
      id: progress.campaign.id,
      title: progress.campaign.title,
      description: progress.campaign.description,
      branch: progress.campaign.branch,
      rank: progress.campaign.rank,
      durationDays: progress.campaign.durationDays,
      totalCards: progress.campaign._count.cards,
      currentDay: progress.currentDay,
      completedCardIds: progress.completedCardIds,
      streak: progress.streak,
      lastActiveDate: progress.lastActiveDate,
      startedAt: progress.startedAt,
    }));
  }

  /**
   * Advance to the next day in a campaign.
   * All cards for the current day must be completed (present in completedCardIds).
   * If it's the last day, mark the campaign as completed.
   */
  async advanceDay(userId: string, campaignId: string) {
    const progress = await this.prisma.userCampaignProgress.findUnique({
      where: {
        userId_campaignId: { userId, campaignId },
      },
    });

    if (!progress) {
      throw new NotFoundException('Campaign not started. Start the campaign first.');
    }

    if (progress.completedAt) {
      throw new BadRequestException('Campaign is already completed');
    }

    // Get all cards for the current day
    const currentDayCards = await this.prisma.campaignCard.findMany({
      where: {
        campaignId,
        dayNumber: progress.currentDay,
      },
      select: { id: true },
    });

    // Check that all current day cards are completed
    const allCompleted = currentDayCards.every((card) =>
      progress.completedCardIds.includes(card.id),
    );

    if (!allCompleted) {
      const completedCount = currentDayCards.filter((card) =>
        progress.completedCardIds.includes(card.id),
      ).length;

      throw new BadRequestException(
        `Not all cards for day ${progress.currentDay} are completed. ` +
        `Progress: ${completedCount}/${currentDayCards.length}`,
      );
    }

    // Get campaign to check total days
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { durationDays: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const isLastDay = progress.currentDay >= campaign.durationDays;
    const today = new Date().toISOString().slice(0, 10);

    // Calculate streak
    const isConsecutiveDay =
      progress.lastActiveDate !== null &&
      this.isYesterday(progress.lastActiveDate);
    const newStreak = isConsecutiveDay ? progress.streak + 1 : 1;

    if (isLastDay) {
      // Campaign completed
      const updatedProgress = await this.prisma.userCampaignProgress.update({
        where: { userId_campaignId: { userId, campaignId } },
        data: {
          completedAt: new Date(),
          streak: newStreak,
          lastActiveDate: today,
        },
      });

      // Remove from active campaigns
      const feedState = await this.prisma.userFeedState.findUnique({
        where: { userId },
      });

      if (feedState) {
        await this.prisma.userFeedState.update({
          where: { userId },
          data: {
            activeCampaignIds: feedState.activeCampaignIds.filter(
              (id) => id !== campaignId,
            ),
          },
        });
      }

      this.logger.log(`User ${userId} completed campaign ${campaignId}`);

      return {
        campaignId,
        currentDay: updatedProgress.currentDay,
        isCompleted: true,
        completedAt: updatedProgress.completedAt,
        streak: newStreak,
        message: 'Campaign completed! Congratulations!',
      };
    }

    // Advance to next day
    const updatedProgress = await this.prisma.userCampaignProgress.update({
      where: { userId_campaignId: { userId, campaignId } },
      data: {
        currentDay: progress.currentDay + 1,
        streak: newStreak,
        lastActiveDate: today,
      },
    });

    this.logger.log(
      `User ${userId} advanced to day ${updatedProgress.currentDay} in campaign ${campaignId}`,
    );

    return {
      campaignId,
      currentDay: updatedProgress.currentDay,
      isCompleted: false,
      streak: newStreak,
      message: `Advanced to day ${updatedProgress.currentDay}`,
    };
  }

  // ──────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────

  /**
   * Check if a campaign is unlocked for a user.
   * A campaign is unlocked if all prerequisiteCampaignIds are completed.
   */
  private async isCampaignUnlocked(
    userId: string,
    prerequisiteCampaignIds: string[],
  ): Promise<boolean> {
    if (prerequisiteCampaignIds.length === 0) {
      return true;
    }

    const completedPrerequisites = await this.prisma.userCampaignProgress.count({
      where: {
        userId,
        campaignId: { in: prerequisiteCampaignIds },
        completedAt: { not: null },
      },
    });

    return completedPrerequisites === prerequisiteCampaignIds.length;
  }

  /**
   * Check if a date string (YYYY-MM-DD) is yesterday.
   */
  private isYesterday(dateStr: string): boolean {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return dateStr === yesterday.toISOString().slice(0, 10);
  }
}
