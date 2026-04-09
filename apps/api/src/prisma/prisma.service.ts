import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_MS ?? '200', 10);

    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    // Log slow queries in all environments
    (this as any).$on('query', (e: { duration: number; query: string; params: string }) => {
      if (e.duration > slowQueryThreshold) {
        this.logger.warn(
          `Slow query (${e.duration}ms): ${e.query.slice(0, 300)}` +
            (isProduction ? '' : ` | params: ${e.params?.slice(0, 200)}`),
        );
      }
    });

    (this as any).$on('warn', (e: { message: string }) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });

    (this as any).$on('error', (e: { message: string }) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');

    // Log pool configuration for observability
    const url = process.env.DATABASE_URL ?? '';
    const poolMatch = url.match(/connection_limit=(\d+)/);
    const timeoutMatch = url.match(/pool_timeout=(\d+)/);
    this.logger.log(
      `Pool config: connection_limit=${poolMatch?.[1] ?? 'default'}, ` +
        `pool_timeout=${timeoutMatch?.[1] ?? 'default'}`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Health check — run a simple query to verify DB connectivity.
   * Returns latency in ms or throws on failure.
   */
  async healthCheck(): Promise<{ status: 'ok'; latencyMs: number }> {
    const start = Date.now();
    await this.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  }
}
