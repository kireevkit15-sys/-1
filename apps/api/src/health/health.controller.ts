import { Controller, Get, HttpCode, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BattleStatus } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

interface CheckResult {
  status: 'ok' | 'down';
  latency_ms?: number;
  error?: string;
  details?: Record<string, unknown>;
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

interface DashboardResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    ai: CheckResult;
    websocket: CheckResult;
  };
  stats: {
    totalUsers: number;
    totalBattles: number;
    totalQuestions: number;
    activeBattles: number;
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
    private readonly config: ConfigService,
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

  @ApiOperation({ summary: 'Полный dashboard статуса всех сервисов (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Dashboard статус' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('dashboard')
  async dashboard(@Res() res: Response): Promise<void> {
    const [database, redis, ai, websocket] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAi(),
      this.checkWebSocket(),
    ]);

    const checks = { database, redis, ai, websocket };
    const checkValues = Object.values(checks);
    const okCount = checkValues.filter(c => c.status === 'ok').length;

    const status: DashboardResponse['status'] =
      okCount === checkValues.length ? 'ok' : okCount === 0 ? 'down' : 'degraded';

    let stats = { totalUsers: 0, totalBattles: 0, totalQuestions: 0, activeBattles: 0 };
    try {
      const [totalUsers, totalBattles, totalQuestions, activeBattles] =
        await this.prisma.$transaction([
          this.prisma.user.count(),
          this.prisma.battle.count(),
          this.prisma.question.count({ where: { isActive: true } }),
          this.prisma.battle.count({ where: { status: BattleStatus.ACTIVE } }),
        ]);
      stats = { totalUsers, totalBattles, totalQuestions, activeBattles };
    } catch {
      /* stats are best-effort */
    }

    const body: DashboardResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
      environment: this.config.get('NODE_ENV') ?? 'development',
      checks,
      stats,
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

  private async checkAi(): Promise<CheckResult> {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return { status: 'down', error: 'ANTHROPIC_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return {
        status: res.ok ? 'ok' : 'down',
        latency_ms: Date.now() - start,
        ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'down', error: message };
    }
  }

  private checkWebSocket(): CheckResult {
    // WebSocket server is embedded in the NestJS process — if this endpoint
    // responds, the WS gateway is running in the same process.
    return {
      status: 'ok',
      details: { transport: 'socket.io', uptime: Math.floor((Date.now() - startTime) / 1000) },
    };
  }
}
