import { Injectable, Logger } from '@nestjs/common';
import { Branch } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const CACHE_TTL = 86_400; // 24h

@Injectable()
export class FactsService {
  private readonly logger = new Logger(FactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Get fact of the day.
   * - If already selected today → return from cache.
   * - Otherwise pick a random unused fact, mark it, cache it.
   */
  async getFactOfTheDay() {
    const date = this.todayUTC();
    const cacheKey = `fact-of-the-day:${date}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check if any fact is already assigned for today
    const todayDate = new Date(date);
    let fact = await this.prisma.dailyFact.findFirst({
      where: { usedAt: todayDate, isActive: true },
    });

    if (!fact) {
      // Pick a random unused fact
      fact = await this.pickRandomUnusedFact();

      if (fact) {
        await this.prisma.dailyFact.update({
          where: { id: fact.id },
          data: { usedAt: todayDate },
        });
      }
    }

    if (!fact) {
      // All facts used — recycle: reset oldest used facts
      await this.recycleOldFacts();
      fact = await this.pickRandomUnusedFact();

      if (fact) {
        await this.prisma.dailyFact.update({
          where: { id: fact.id },
          data: { usedAt: todayDate },
        });
      }
    }

    const result = fact
      ? {
          id: fact.id,
          text: fact.text,
          source: fact.source,
          branch: fact.branch,
          category: fact.category,
          date,
        }
      : {
          id: null,
          text: 'Знание — сила. Продолжайте учиться!',
          source: null,
          branch: 'STRATEGY',
          category: 'Общее',
          date,
        };

    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  private async pickRandomUnusedFact() {
    const facts = await this.prisma.$queryRaw<
      Array<{
        id: string;
        text: string;
        source: string | null;
        branch: Branch;
        category: string;
        isActive: boolean;
        usedAt: Date | null;
        createdAt: Date;
      }>
    >`
      SELECT * FROM daily_facts
      WHERE "isActive" = true AND "usedAt" IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `;

    return facts[0] ?? null;
  }

  private async recycleOldFacts(): Promise<void> {
    // Reset usedAt for the oldest half of used facts
    const usedCount = await this.prisma.dailyFact.count({
      where: { isActive: true, usedAt: { not: null } },
    });

    if (usedCount === 0) return;

    const toReset = Math.max(Math.floor(usedCount / 2), 10);
    const oldest = await this.prisma.dailyFact.findMany({
      where: { isActive: true, usedAt: { not: null } },
      orderBy: { usedAt: 'asc' },
      take: toReset,
      select: { id: true },
    });

    await this.prisma.dailyFact.updateMany({
      where: { id: { in: oldest.map((f) => f.id) } },
      data: { usedAt: null },
    });

    this.logger.log(`Recycled ${oldest.length} old facts`);
  }

  /**
   * Admin: add a new fact.
   */
  async create(data: {
    text: string;
    source?: string;
    branch: string;
    category: string;
  }) {
    return this.prisma.dailyFact.create({
      data: {
        text: data.text,
        source: data.source,
        branch: data.branch as 'STRATEGY' | 'LOGIC',
        category: data.category,
      },
    });
  }

  /**
   * Admin: list all facts with pagination.
   */
  async findAll(params: { limit?: number; offset?: number; branch?: string }) {
    const where = params.branch ? { branch: params.branch as 'STRATEGY' | 'LOGIC' } : {};

    const [facts, total] = await Promise.all([
      this.prisma.dailyFact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      this.prisma.dailyFact.count({ where }),
    ]);

    return { facts, total };
  }
}
