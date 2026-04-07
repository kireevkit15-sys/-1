import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum EventType {
  BATTLE_STARTED = 'battle_started',
  BATTLE_FINISHED = 'battle_finished',
  ANSWER_GIVEN = 'answer_given',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  WARMUP_COMPLETED = 'warmup_completed',
  REFERRAL_APPLIED = 'referral_applied',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(
    type: string,
    userId?: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          type,
          userId: userId ?? null,
          payload: (payload ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to track event ${type}: ${(error as Error).message}`,
      );
    }
  }

  async getEvents(params: {
    type?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.AnalyticsEventWhereInput = {};

    if (params.type) where.type = params.type;
    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [events, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return { events, total };
  }

  async getEventCounts(params: {
    from?: Date;
    to?: Date;
  }): Promise<Record<string, number>> {
    const where: Prisma.AnalyticsEventWhereInput = {};

    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const counts = await this.prisma.analyticsEvent.groupBy({
      by: ['type'],
      where,
      _count: { id: true },
    });

    return Object.fromEntries(
      counts.map((c) => [c.type, c._count.id]),
    );
  }
}
