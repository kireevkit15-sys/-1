import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';

interface RoundResult {
  roundNumber: number;
  questionId: string;
  playerAnswer: string;
  opponentAnswer: string;
  playerCorrect: boolean;
  opponentCorrect: boolean;
  playerDefense: string | null;
  opponentDefense: string | null;
  playerDamage: number;
  opponentDamage: number;
}

@Injectable()
export class BattleService {
  private readonly BASE_DAMAGE = 25;
  private readonly K_FACTOR = 32;

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
  ) {}

  async createBattle(
    userId: string,
    mode: 'bot' | 'matchmaking',
    category?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (mode === 'bot') {
      const battle = await this.prisma.battle.create({
        data: {
          player1Id: userId,
          player2Id: null,
          mode: 'BOT',
          status: 'IN_PROGRESS',
          category: category || null,
          player1Hp: 100,
          player2Hp: 100,
          currentRound: 1,
        },
      });

      return battle;
    }

    // For matchmaking, return a pending battle; actual matching happens via WebSocket
    const battle = await this.prisma.battle.create({
      data: {
        player1Id: userId,
        mode: 'PVP',
        status: 'WAITING',
        category: category || null,
        player1Hp: 100,
        player2Hp: 100,
        currentRound: 1,
      },
    });

    return battle;
  }

  async getBattle(battleId: string) {
    return this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        player1: {
          select: { id: true, name: true, avatar: true, rating: true },
        },
        player2: {
          select: { id: true, name: true, avatar: true, rating: true },
        },
        rounds: {
          include: {
            question: true,
          },
          orderBy: { roundNumber: 'asc' },
        },
      },
    });
  }

  async getUserBattleHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [battles, total] = await Promise.all([
      this.prisma.battle.findMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
        include: {
          player1: {
            select: { id: true, name: true, avatar: true },
          },
          player2: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.battle.count({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      battles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processRound(
    battleId: string,
    userId: string,
    answerId: string,
    defenseType: string | null,
  ): Promise<RoundResult> {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
      },
    });

    if (!battle) {
      throw new HttpException('Battle not found', HttpStatus.NOT_FOUND);
    }

    if (battle.status !== 'IN_PROGRESS') {
      throw new HttpException('Battle is not in progress', HttpStatus.BAD_REQUEST);
    }

    const isPlayer1 = battle.player1Id === userId;
    const currentRound = battle.currentRound;

    // Get current question for this round
    const question = await this.prisma.question.findFirst({
      where: { category: battle.category || undefined },
      skip: currentRound - 1,
    });

    if (!question) {
      throw new HttpException('No question available', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const playerCorrect = answerId === question.correctAnswer;

    // Bot or opponent answer
    let opponentAnswer: string;
    let opponentCorrect: boolean;
    let opponentDefense: string | null = null;

    if (battle.mode === 'BOT') {
      const botResult = this.botService.generateBotAnswer(
        question.correctAnswer,
        question.options as string[],
      );
      opponentAnswer = botResult.answer;
      opponentCorrect = botResult.correct;
      opponentDefense = this.botService.generateBotDefense();
    } else {
      // PVP: opponent answer should be submitted separately via WebSocket
      opponentAnswer = '';
      opponentCorrect = false;
    }

    // Calculate damage
    const playerDamage = playerCorrect ? this.BASE_DAMAGE : 0;
    const opponentDamage = opponentCorrect ? this.BASE_DAMAGE : 0;

    // Apply defense reduction
    const effectivePlayerDamage = opponentDefense
      ? Math.floor(playerDamage * 0.5)
      : playerDamage;
    const effectiveOpponentDamage = defenseType
      ? Math.floor(opponentDamage * 0.5)
      : opponentDamage;

    // Update HP
    const newPlayer1Hp = isPlayer1
      ? Math.max(0, battle.player1Hp - effectiveOpponentDamage)
      : Math.max(0, battle.player1Hp - effectivePlayerDamage);
    const newPlayer2Hp = isPlayer1
      ? Math.max(0, battle.player2Hp - effectivePlayerDamage)
      : Math.max(0, battle.player2Hp - effectiveOpponentDamage);

    // Save round
    await this.prisma.battleRound.create({
      data: {
        battleId,
        roundNumber: currentRound,
        questionId: question.id,
        player1Answer: isPlayer1 ? answerId : opponentAnswer,
        player2Answer: isPlayer1 ? opponentAnswer : answerId,
        player1Correct: isPlayer1 ? playerCorrect : opponentCorrect,
        player2Correct: isPlayer1 ? opponentCorrect : playerCorrect,
        player1Defense: isPlayer1 ? defenseType : opponentDefense,
        player2Defense: isPlayer1 ? opponentDefense : defenseType,
      },
    });

    // Check if battle is over
    const isOver = newPlayer1Hp <= 0 || newPlayer2Hp <= 0 || currentRound >= 10;

    await this.prisma.battle.update({
      where: { id: battleId },
      data: {
        player1Hp: newPlayer1Hp,
        player2Hp: newPlayer2Hp,
        currentRound: isOver ? currentRound : currentRound + 1,
        status: isOver ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isOver ? new Date() : null,
        winnerId: isOver ? this.determineWinner(battle.player1Id, battle.player2Id, newPlayer1Hp, newPlayer2Hp) : null,
      },
    });

    if (isOver) {
      await this.updateStats(
        battle.player1Id,
        battle.player2Id,
        newPlayer1Hp,
        newPlayer2Hp,
      );
    }

    return {
      roundNumber: currentRound,
      questionId: question.id,
      playerAnswer: answerId,
      opponentAnswer,
      playerCorrect,
      opponentCorrect,
      playerDefense: defenseType,
      opponentDefense,
      playerDamage: effectivePlayerDamage,
      opponentDamage: effectiveOpponentDamage,
    };
  }

  private determineWinner(
    player1Id: string,
    player2Id: string | null,
    player1Hp: number,
    player2Hp: number,
  ): string | null {
    if (player1Hp > player2Hp) return player1Id;
    if (player2Hp > player1Hp) return player2Id;
    return null; // draw
  }

  private async updateStats(
    player1Id: string,
    player2Id: string | null,
    player1Hp: number,
    player2Hp: number,
  ) {
    const winner = this.determineWinner(player1Id, player2Id, player1Hp, player2Hp);

    // Update player 1 stats
    await this.updatePlayerStats(player1Id, winner === player1Id, winner === null);

    // Update player 2 stats (if not a bot)
    if (player2Id) {
      await this.updatePlayerStats(player2Id, winner === player2Id, winner === null);
      await this.updateRatings(player1Id, player2Id, winner);
    }
  }

  private async updatePlayerStats(
    userId: string,
    won: boolean,
    draw: boolean,
  ) {
    await this.prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalBattles: 1,
        wins: won ? 1 : 0,
        losses: !won && !draw ? 1 : 0,
        draws: draw ? 1 : 0,
        winStreak: won ? 1 : 0,
        bestWinStreak: won ? 1 : 0,
      },
      update: {
        totalBattles: { increment: 1 },
        wins: won ? { increment: 1 } : undefined,
        losses: !won && !draw ? { increment: 1 } : undefined,
        draws: draw ? { increment: 1 } : undefined,
        winStreak: won ? { increment: 1 } : 0,
        bestWinStreak: won
          ? {
              increment: 0, // Will be handled below
            }
          : undefined,
      },
    });

    // Update best win streak
    if (won) {
      const stats = await this.prisma.userStats.findUnique({
        where: { userId },
      });
      if (stats && stats.winStreak > stats.bestWinStreak) {
        await this.prisma.userStats.update({
          where: { userId },
          data: { bestWinStreak: stats.winStreak },
        });
      }
    }
  }

  private async updateRatings(
    player1Id: string,
    player2Id: string,
    winnerId: string | null,
  ) {
    const [p1, p2] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: player1Id } }),
      this.prisma.user.findUnique({ where: { id: player2Id } }),
    ]);

    if (!p1 || !p2) return;

    const expectedP1 =
      1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
    const expectedP2 = 1 - expectedP1;

    let scoreP1: number;
    let scoreP2: number;

    if (winnerId === player1Id) {
      scoreP1 = 1;
      scoreP2 = 0;
    } else if (winnerId === player2Id) {
      scoreP1 = 0;
      scoreP2 = 1;
    } else {
      scoreP1 = 0.5;
      scoreP2 = 0.5;
    }

    const newRatingP1 = Math.round(
      p1.rating + this.K_FACTOR * (scoreP1 - expectedP1),
    );
    const newRatingP2 = Math.round(
      p2.rating + this.K_FACTOR * (scoreP2 - expectedP2),
    );

    await Promise.all([
      this.prisma.user.update({
        where: { id: player1Id },
        data: { rating: Math.max(0, newRatingP1) },
      }),
      this.prisma.user.update({
        where: { id: player2Id },
        data: { rating: Math.max(0, newRatingP2) },
      }),
    ]);
  }
}
