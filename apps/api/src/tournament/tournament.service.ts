import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';

interface BracketMatch {
  round: number;
  match: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
}

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
  ) {}

  /**
   * Create a new tournament (admin only).
   */
  async create(data: {
    name: string;
    description?: string;
    maxPlayers?: number;
    xpPrizePool?: number;
    startsAt: string;
  }) {
    const maxPlayers = data.maxPlayers ?? 8;
    if (![8, 16].includes(maxPlayers)) {
      throw new BadRequestException('maxPlayers must be 8 or 16');
    }

    return this.prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        maxPlayers,
        xpPrizePool: data.xpPrizePool ?? 1000,
        startsAt: new Date(data.startsAt),
      },
    });
  }

  /**
   * List tournaments (with optional status filter).
   */
  async list(status?: string) {
    return this.prisma.tournament.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { seed: 'asc' },
        },
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  /**
   * Get tournament details.
   */
  async getById(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { seed: 'asc' },
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  /**
   * Join a tournament.
   */
  async join(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament is not accepting registrations');
    }
    if (tournament._count.participants >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    try {
      return await this.prisma.tournamentParticipant.create({
        data: { tournamentId, userId },
      });
    } catch {
      throw new ConflictException('Already registered for this tournament');
    }
  }

  /**
   * Leave a tournament (before it starts).
   */
  async leave(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Cannot leave after tournament started');
    }

    await this.prisma.tournamentParticipant.deleteMany({
      where: { tournamentId, userId },
    });

    return { message: 'Left tournament' };
  }

  /**
   * Start a tournament: seed players by rating, generate bracket.
   */
  async start(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: { user: { select: { id: true, stats: { select: { rating: true } } } } },
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException('Tournament already started');
    }
    if (tournament.participants.length < 4) {
      throw new BadRequestException('Need at least 4 participants');
    }

    // Seed by rating (highest first)
    const sorted = tournament.participants.sort(
      (a, b) => (b.user.stats?.rating ?? 1000) - (a.user.stats?.rating ?? 1000),
    );

    // Update seeds
    for (let i = 0; i < sorted.length; i++) {
      await this.prisma.tournamentParticipant.update({
        where: { id: sorted[i]!.id },
        data: { seed: i + 1 },
      });
    }

    // Generate bracket (single elimination)
    const bracket = this.generateBracket(sorted.map(p => p.userId));

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: TournamentStatus.IN_PROGRESS,
        bracket: bracket as any,
      },
    });

    this.logger.log(`Tournament ${tournament.name} started with ${sorted.length} players`);
    return this.getById(tournamentId);
  }

  /**
   * Record match result in tournament bracket.
   */
  async recordResult(tournamentId: string, round: number, match: number, winnerId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw new BadRequestException('Tournament is not in progress');
    }

    const bracket = tournament.bracket as unknown as BracketMatch[];
    const matchEntry = bracket.find(m => m.round === round && m.match === match);
    if (!matchEntry) throw new NotFoundException('Match not found in bracket');

    if (matchEntry.player1Id !== winnerId && matchEntry.player2Id !== winnerId) {
      throw new BadRequestException('Winner must be a participant of this match');
    }

    // Record winner
    matchEntry.winnerId = winnerId;

    // Eliminate loser
    const loserId = matchEntry.player1Id === winnerId ? matchEntry.player2Id : matchEntry.player1Id;
    if (loserId) {
      await this.prisma.tournamentParticipant.updateMany({
        where: { tournamentId, userId: loserId },
        data: { eliminated: true },
      });
    }

    // Advance winner to next round
    const nextRound = round + 1;
    const nextMatch = Math.floor((match - 1) / 2) + 1;
    const nextEntry = bracket.find(m => m.round === nextRound && m.match === nextMatch);
    if (nextEntry) {
      if (!nextEntry.player1Id) {
        nextEntry.player1Id = winnerId;
      } else {
        nextEntry.player2Id = winnerId;
      }
    }

    // Check if tournament is complete (final round winner)
    const totalRounds = Math.ceil(Math.log2(tournament.maxPlayers));
    const isComplete = round === totalRounds;

    if (isComplete) {
      // Award prizes
      await this.completeTournament(tournamentId, winnerId, bracket);
    }

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        bracket: bracket as any,
        ...(isComplete ? { status: TournamentStatus.COMPLETED } : {}),
      },
    });

    return this.getById(tournamentId);
  }

  private async completeTournament(tournamentId: string, winnerId: string, bracket: BracketMatch[]) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) return;

    const pool = tournament.xpPrizePool;

    // 1st place: 50%, 2nd: 25%, 3rd/4th: 12.5% each
    const prizes: Record<number, number> = {
      1: Math.floor(pool * 0.5),
      2: Math.floor(pool * 0.25),
      3: Math.floor(pool * 0.125),
      4: Math.floor(pool * 0.125),
    };

    // Find placements from bracket
    const totalRounds = Math.ceil(Math.log2(tournament.maxPlayers));
    const finalMatch = bracket.find(m => m.round === totalRounds);
    const semiFinals = bracket.filter(m => m.round === totalRounds - 1);

    const placements: { userId: string; placement: number }[] = [];
    if (finalMatch?.winnerId) {
      placements.push({ userId: finalMatch.winnerId, placement: 1 });
      const secondId = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id;
      if (secondId) placements.push({ userId: secondId, placement: 2 });
    }

    // Semi-final losers get 3rd
    let thirdPlace = 3;
    for (const sf of semiFinals) {
      if (sf.winnerId) {
        const loserId = sf.player1Id === sf.winnerId ? sf.player2Id : sf.player1Id;
        if (loserId && !placements.find(p => p.userId === loserId)) {
          placements.push({ userId: loserId, placement: thirdPlace++ });
        }
      }
    }

    // Update participants with placement and XP
    for (const p of placements) {
      const xpReward = prizes[p.placement] ?? 0;
      await this.prisma.tournamentParticipant.updateMany({
        where: { tournamentId, userId: p.userId },
        data: { placement: p.placement, xpReward },
      });

      if (xpReward > 0) {
        await this.stats.addXp(p.userId, 'strategyXp', xpReward);
      }
    }

    this.logger.log(`Tournament ${tournament.name} completed. Winner: ${winnerId}`);
  }

  private generateBracket(playerIds: string[]): BracketMatch[] {
    const n = playerIds.length;
    const totalRounds = Math.ceil(Math.log2(n));
    const bracket: BracketMatch[] = [];

    // Round 1: pair players (1v8, 2v7, 3v6, 4v5 for 8 players)
    const r1Matches = Math.ceil(n / 2);
    for (let i = 0; i < r1Matches; i++) {
      bracket.push({
        round: 1,
        match: i + 1,
        player1Id: playerIds[i] ?? null,
        player2Id: playerIds[n - 1 - i] ?? null,
        winnerId: null,
      });
    }

    // Subsequent rounds: empty slots
    for (let round = 2; round <= totalRounds; round++) {
      const matches = Math.ceil(r1Matches / Math.pow(2, round - 1));
      for (let m = 0; m < matches; m++) {
        bracket.push({
          round,
          match: m + 1,
          player1Id: null,
          player2Id: null,
          winnerId: null,
        });
      }
    }

    return bracket;
  }
}
