import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { AppealStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BanService {
  private readonly logger = new Logger(BanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ban a user (admin only).
   */
  async banUser(data: {
    userId: string;
    reason: string;
    type: 'TEMPORARY' | 'PERMANENT';
    durationHours?: number;
    issuedBy?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    if (data.type === 'TEMPORARY' && !data.durationHours) {
      throw new BadRequestException('durationHours is required for temporary bans');
    }

    const expiresAt =
      data.type === 'TEMPORARY' && data.durationHours
        ? new Date(Date.now() + data.durationHours * 3600_000)
        : null;

    const ban = await this.prisma.userBan.create({
      data: {
        userId: data.userId,
        reason: data.reason,
        type: data.type,
        expiresAt,
        issuedBy: data.issuedBy,
      },
    });

    this.logger.warn(`User ${data.userId} banned: ${data.type}, reason: ${data.reason}`);
    return ban;
  }

  /**
   * Lift (unban) a specific ban.
   */
  async liftBan(banId: string) {
    const ban = await this.prisma.userBan.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('Ban not found');
    if (ban.liftedAt) throw new BadRequestException('Ban already lifted');

    return this.prisma.userBan.update({
      where: { id: banId },
      data: { liftedAt: new Date() },
    });
  }

  /**
   * Get all bans for a user.
   */
  async getUserBans(userId: string) {
    return this.prisma.userBan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all active bans (admin list).
   */
  async getActiveBans() {
    return this.prisma.userBan.findMany({
      where: {
        liftedAt: null,
        OR: [
          { type: 'PERMANENT' },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if a user is currently banned. Returns the active ban or null.
   */
  async getActiveBan(userId: string) {
    return this.prisma.userBan.findFirst({
      where: {
        userId,
        liftedAt: null,
        OR: [
          { type: 'PERMANENT' },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Submit an appeal for a ban.
   */
  async submitAppeal(banId: string, userId: string, appealText: string) {
    const ban = await this.prisma.userBan.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('Ban not found');
    if (ban.userId !== userId) throw new ForbiddenException('Not your ban');
    if (ban.liftedAt) throw new BadRequestException('Ban already lifted');
    if (ban.appealStatus) throw new BadRequestException('Appeal already submitted');

    return this.prisma.userBan.update({
      where: { id: banId },
      data: {
        appealText,
        appealedAt: new Date(),
        appealStatus: AppealStatus.PENDING,
      },
    });
  }

  /**
   * Review an appeal (admin only).
   */
  async reviewAppeal(banId: string, decision: 'APPROVED' | 'REJECTED') {
    const ban = await this.prisma.userBan.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('Ban not found');
    if (ban.appealStatus !== AppealStatus.PENDING) {
      throw new BadRequestException('No pending appeal for this ban');
    }

    const update: Record<string, unknown> = { appealStatus: decision };
    if (decision === 'APPROVED') {
      update.liftedAt = new Date();
    }

    const result = await this.prisma.userBan.update({
      where: { id: banId },
      data: update,
    });

    this.logger.log(`Appeal for ban ${banId} ${decision}`);
    return result;
  }

  /**
   * Get all pending appeals (admin).
   */
  async getPendingAppeals() {
    return this.prisma.userBan.findMany({
      where: { appealStatus: AppealStatus.PENDING },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { appealedAt: 'asc' },
    });
  }
}
