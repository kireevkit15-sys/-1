import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Subscribe a user to push notifications.
   * If the endpoint already exists, update keys.
   */
  async subscribe(
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string },
  ) {
    const sub = await this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });

    this.logger.log(`User ${userId} subscribed to push: ${data.endpoint.slice(0, 50)}...`);
    return { id: sub.id, endpoint: sub.endpoint, createdAt: sub.createdAt };
  }

  /**
   * Unsubscribe a push endpoint for a user.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const deleted = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });

    if (deleted.count > 0) {
      this.logger.log(`User ${userId} unsubscribed push: ${endpoint.slice(0, 50)}...`);
    }

    return deleted.count > 0;
  }

  /**
   * Get all push subscriptions for a user.
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, createdAt: true },
    });
  }
}
