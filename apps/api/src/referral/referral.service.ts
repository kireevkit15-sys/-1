import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';

const REFERRAL_XP_REWARD = 50;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramNotification: TelegramNotificationService,
  ) {}

  async getMyCode(userId: string): Promise<{ code: string; link: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    return {
      code: user.referralCode,
      link: `https://razum.app/invite/${user.referralCode}`,
    };
  }

  async apply(
    inviteeId: string,
    code: string,
  ): Promise<{ message: string; xpRewarded: number }> {
    // Find referrer by code
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true },
    });

    if (!referrer) {
      throw new NotFoundException('Реферальный код не найден');
    }

    if (referrer.id === inviteeId) {
      throw new BadRequestException('Нельзя использовать собственный реферальный код');
    }

    // Check if invitee already has a referrer
    const existing = await this.prisma.referral.findUnique({
      where: { inviteeId },
    });

    if (existing) {
      throw new ConflictException('Вы уже использовали реферальный код');
    }

    // Create referral and reward XP in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          inviteeId,
          xpRewarded: true,
        },
      });

      // XP reward for referrer
      await tx.userStats.upsert({
        where: { userId: referrer.id },
        create: {
          userId: referrer.id,
          eruditionXp: REFERRAL_XP_REWARD,
        },
        update: {
          eruditionXp: { increment: REFERRAL_XP_REWARD },
        },
      });

      // XP reward for invitee
      await tx.userStats.upsert({
        where: { userId: inviteeId },
        create: {
          userId: inviteeId,
          eruditionXp: REFERRAL_XP_REWARD,
        },
        update: {
          eruditionXp: { increment: REFERRAL_XP_REWARD },
        },
      });
    });

    // Notify referrer via Telegram (fire-and-forget)
    const invitee = await this.prisma.user.findUnique({
      where: { id: inviteeId },
      select: { name: true },
    });
    this.telegramNotification
      .sendInviteAccepted(referrer.id, invitee?.name ?? 'Новый пользователь')
      .catch((err) =>
        this.logger.warn(`Failed to send referral notification: ${(err as Error).message}`),
      );

    return {
      message: `Реферальный код применён! Вы и ${referrer.name} получили ${REFERRAL_XP_REWARD} XP`,
      xpRewarded: REFERRAL_XP_REWARD,
    };
  }

  async getStats(
    userId: string,
  ): Promise<{
    totalInvited: number;
    totalXpEarned: number;
    referrals: { inviteeName: string; createdAt: Date }[];
  }> {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        invitee: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalInvited: referrals.length,
      totalXpEarned: referrals.filter((r) => r.xpRewarded).length * REFERRAL_XP_REWARD,
      referrals: referrals.map((r) => ({
        inviteeName: r.invitee.name,
        createdAt: r.createdAt,
      })),
    };
  }
}
