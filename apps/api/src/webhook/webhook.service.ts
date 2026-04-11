import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type WebhookEvent =
  | 'battle.started'
  | 'battle.finished'
  | 'user.registered'
  | 'user.levelUp'
  | 'tournament.started'
  | 'tournament.finished'
  | 'season.ended';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Register a new webhook endpoint (admin).
   */
  async register(data: { url: string; events: WebhookEvent[]; secret?: string }) {
    return this.prisma.webhookEndpoint.create({
      data: {
        url: data.url,
        events: data.events,
        secret: data.secret,
      },
    });
  }

  /**
   * List all webhook endpoints.
   */
  async list() {
    return this.prisma.webhookEndpoint.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a webhook endpoint.
   */
  async remove(id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');

    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { message: 'Webhook endpoint deleted' };
  }

  /**
   * Toggle active/inactive.
   */
  async toggle(id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');

    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: { active: !endpoint.active },
    });
  }

  /**
   * Dispatch an event to all matching webhook endpoints.
   * Non-blocking: failures are logged but don't throw.
   */
  async dispatch(event: WebhookEvent, payload: Record<string, unknown>) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { active: true },
    });

    const matching = endpoints.filter(ep =>
      (ep.events as string[]).includes(event),
    );

    if (matching.length === 0) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

    for (const ep of matching) {
      this.sendWebhook(ep.id, ep.url, ep.secret, body).catch(() => {
        /* logged inside sendWebhook */
      });
    }
  }

  private async sendWebhook(endpointId: string, url: string, secret: string | null, body: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) {
      const crypto = await import('crypto');
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });

      // Track delivery
      await this.prisma.webhookDelivery.create({
        data: {
          endpointId,
          event: JSON.parse(body).event,
          payload: JSON.parse(body),
          statusCode: res.status,
          success: res.ok,
        },
      });

      if (!res.ok) {
        this.logger.warn(`Webhook ${url} returned ${res.status}`);
        await this.trackFailure(endpointId);
      } else {
        await this.redis.getClient().del(`webhook:failures:${endpointId}`);
      }
    } catch (err) {
      this.logger.error(`Webhook ${url} failed: ${(err as Error).message}`);

      await this.prisma.webhookDelivery.create({
        data: {
          endpointId,
          event: JSON.parse(body).event,
          payload: JSON.parse(body),
          statusCode: 0,
          success: false,
          error: (err as Error).message,
        },
      });

      await this.trackFailure(endpointId);
    }
  }

  /**
   * Auto-disable after 10 consecutive failures.
   */
  private async trackFailure(endpointId: string) {
    const key = `webhook:failures:${endpointId}`;
    const count = await this.redis.getClient().incr(key);
    await this.redis.getClient().expire(key, 86400);

    if (count >= 10) {
      await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { active: false },
      });
      this.logger.warn(`Webhook ${endpointId} auto-disabled after 10 failures`);
    }
  }

  /**
   * Get delivery history for an endpoint.
   */
  async getDeliveries(endpointId: string, limit = 20) {
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
