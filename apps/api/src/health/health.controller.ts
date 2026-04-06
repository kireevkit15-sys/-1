import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface CheckResult {
  status: 'ok' | 'down';
  latency_ms?: number;
  error?: string;
}

interface ReadinessResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
  };
}

const startTime = Date.now();

@ApiTags('Health')
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ApiOperation({ summary: 'Быстрая проверка (для load balancer)' })
  @ApiResponse({ status: 200, description: 'Сервис запущен' })
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: 'Проверка зависимостей (для Kubernetes readiness)' })
  @ApiResponse({ status: 200, description: 'Все зависимости доступны' })
  @ApiResponse({ status: 503, description: 'Одна или несколько зависимостей недоступны' })
  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    const checks: ReadinessResponse['checks'] = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allOk = checks.database.status === 'ok' && checks.redis.status === 'ok';
    const allDown = checks.database.status === 'down' && checks.redis.status === 'down';

    const status: ReadinessResponse['status'] = allOk
      ? 'ok'
      : allDown
        ? 'down'
        : 'degraded';

    const body: ReadinessResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    const httpStatus = status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(body);
  }

  private async checkDatabase(): Promise<CheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', latency_ms: Date.now() - start };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'down', error: message };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const start = Date.now();
    try {
      const client = this.redis.getClient();
      await client.ping();
      return { status: 'ok', latency_ms: Date.now() - start };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'down', error: message };
    }
  }
}
