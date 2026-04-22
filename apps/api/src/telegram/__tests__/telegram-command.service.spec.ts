/**
 * Unit tests for TelegramCommandService (Launch.4).
 *
 * Covers /start, /help, /stats, /leaderboard message building.
 * Pure logic — no Telegraf, no real DB. Prisma + Leaderboard mocked.
 */

import { Test } from '@nestjs/testing';
import { TelegramCommandService } from '../telegram-command.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaderboardService } from '../../stats/leaderboard.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockLeaderboard = {
  getLeaderboard: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'WEB_URL') return 'https://razum.test';
    return undefined;
  }),
};

describe('TelegramCommandService', () => {
  let service: TelegramCommandService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        TelegramCommandService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LeaderboardService, useValue: mockLeaderboard },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(TelegramCommandService);
  });

  describe('buildWelcomeMessage', () => {
    it('new user — returns onboarding with /privacy + /terms links', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const msg = await service.buildWelcomeMessage(123n, 456n);

      expect(msg).toContain('Добро пожаловать');
      expect(msg).toContain('https://razum.test/privacy');
      expect(msg).toContain('https://razum.test/terms');
      expect(msg).toContain('Правила');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('existing user — greets by name and re-binds telegramChatId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Яшкин',
        deletedAt: null,
      });

      const msg = await service.buildWelcomeMessage(123n, 456n);

      expect(msg).toContain('С возвращением, Яшкин');
      expect(msg).toContain('/stats');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { telegramChatId: 456n },
      });
    });

    it('soft-deleted user — treated as new (onboarding flow)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Deleted',
        deletedAt: new Date(),
      });

      const msg = await service.buildWelcomeMessage(123n, 456n);

      expect(msg).toContain('Добро пожаловать');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('buildHelpMessage', () => {
    it('lists all four commands', () => {
      const msg = service.buildHelpMessage();
      expect(msg).toContain('/start');
      expect(msg).toContain('/stats');
      expect(msg).toContain('/leaderboard');
      expect(msg).toContain('/help');
      expect(msg).toContain('https://razum.test');
    });
  });

  describe('buildStatsMessage', () => {
    it('unknown telegramId — points to registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const msg = await service.buildStatsMessage(999n);
      expect(msg).toContain('Не нашёл твой профиль');
      expect(msg).toContain('https://razum.test');
    });

    it('soft-deleted user — same as unknown', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'X',
        deletedAt: new Date(),
        stats: null,
      });
      const msg = await service.buildStatsMessage(999n);
      expect(msg).toContain('Не нашёл твой профиль');
    });

    it('user without stats — friendly hint to start', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Новичок',
        deletedAt: null,
        stats: null,
      });
      const msg = await service.buildStatsMessage(999n);
      expect(msg).toContain('Новичок');
      expect(msg).toContain('разминку');
    });

    it('full stats — renders rating, streak, branches, thinker class', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Яшкин',
        deletedAt: null,
        stats: {
          rating: 1450,
          streakDays: 12,
          logicXp: 500,
          eruditionXp: 300,
          strategyXp: 700,
          rhetoricXp: 200,
          intuitionXp: 100,
          thinkerClass: 'СТРАТЕГ',
        },
      });

      const msg = await service.buildStatsMessage(1n);

      expect(msg).toContain('Яшкин');
      expect(msg).toContain('1450');
      expect(msg).toContain('12 дн');
      expect(msg).toContain('СТРАТЕГ');
      expect(msg).toContain('1800'); // total XP
      expect(msg).toContain('Логика');
      expect(msg).toContain('Стратегия');
    });
  });

  describe('buildLeaderboardMessage', () => {
    it('empty board — friendly fallback', async () => {
      mockLeaderboard.getLeaderboard.mockResolvedValue({ entries: [] });
      const msg = await service.buildLeaderboardMessage();
      expect(msg).toContain('пуст');
    });

    it('renders medals for top-3 and numeric rank for the rest', async () => {
      mockLeaderboard.getLeaderboard.mockResolvedValue({
        entries: [
          { rank: 1, user: { name: 'A' }, totalXp: 5000, level: 10 },
          { rank: 2, user: { name: 'B' }, totalXp: 4000, level: 9 },
          { rank: 3, user: { name: 'C' }, totalXp: 3000, level: 8 },
          { rank: 4, user: { name: 'D' }, totalXp: 2000, level: 7 },
        ],
      });

      const msg = await service.buildLeaderboardMessage();

      expect(msg).toContain('🥇 A');
      expect(msg).toContain('🥈 B');
      expect(msg).toContain('🥉 C');
      expect(msg).toContain('#4 D');
      expect(msg).toContain('5000 XP');
    });

    it('passes limit to LeaderboardService', async () => {
      mockLeaderboard.getLeaderboard.mockResolvedValue({ entries: [] });
      await service.buildLeaderboardMessage(5);
      expect(mockLeaderboard.getLeaderboard).toHaveBeenCalledWith('xp', 'all', 5);
    });
  });
});
