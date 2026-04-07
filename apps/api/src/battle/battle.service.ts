import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';
import { QuestionService } from '../question/question.service';
import {
  createBattle,
  selectCategory,
  chooseDifficulty,
  submitAnswer,
  submitDefense,
  nextPhase,
  isGameOver,
  getResult,
  handleTimeout,
  handleDisconnect,
  calculateRatingChange,
  BattleMode,
  BattlePhase,
  ELO_DEFAULT_RATING,
} from '@razum/shared';
import type { BattleState, BattleResult } from '@razum/shared';

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private readonly questionService: QuestionService,
  ) {}

  // ── Create ────────────────────────────────────

  /**
   * Create a battle against a bot. Immediately active.
   */
  async createBotBattle(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const categories = await this.getAvailableCategories();

    const state = createBattle(
      { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? undefined },
      { id: 'bot', name: 'РАЗУМ-бот' },
      BattleMode.SIEGE,
      categories,
    );

    const battle = await this.prisma.battle.create({
      data: {
        id: state.id,
        player1Id: userId,
        player2Id: null,
        mode: 'SIEGE',
        status: 'ACTIVE',
        category: null,
        state: state as unknown as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    return battle;
  }

  /**
   * Create a PvP battle waiting for an opponent.
   */
  async createPvpBattle(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const battle = await this.prisma.battle.create({
      data: {
        player1Id: userId,
        mode: 'SIEGE',
        status: 'WAITING',
        state: {},
      },
    });

    return battle;
  }

  // ── Read ──────────────────────────────────────

  /**
   * Get a battle by ID with its rounds.
   */
  async getBattle(battleId: string) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        player1: {
          select: { id: true, name: true, avatarUrl: true },
        },
        player2: {
          select: { id: true, name: true, avatarUrl: true },
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    if (!battle) {
      throw new HttpException('Battle not found', HttpStatus.NOT_FOUND);
    }

    return battle;
  }

  /**
   * Get the in-memory BattleState from the DB JSON column.
   */
  async getBattleState(battleId: string): Promise<BattleState> {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: { state: true, status: true },
    });

    if (!battle) {
      throw new HttpException('Battle not found', HttpStatus.NOT_FOUND);
    }

    return battle.state as unknown as BattleState;
  }

  /**
   * Get paginated battle history for a user.
   */
  async getUserHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [battles, total] = await Promise.all([
      this.prisma.battle.findMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
        include: {
          player1: { select: { id: true, name: true, avatarUrl: true } },
          player2: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { endedAt: 'desc' },
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

  // ── Game flow ─────────────────────────────────

  /**
   * Select a category for the current round.
   */
  async processCategory(battleId: string, userId: string, category: string) {
    const state = await this.getBattleState(battleId);
    this.assertActive(battleId, state);

    try {
      const newState = selectCategory(state, category);
      await this.saveState(battleId, newState);
      return newState;
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Process an attack: choose difficulty, look up question, submit answer, persist round.
   */
  async processAttack(
    battleId: string,
    userId: string,
    difficulty: string,
    answerIndex: number,
    questionId: string,
  ) {
    let state = await this.getBattleState(battleId);
    this.assertActive(battleId, state);

    // Look up the question to check correctness
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
    }

    const isCorrect = answerIndex === question.correctIndex;

    try {
      // Step 1: choose difficulty (creates round entry in state)
      state = chooseDifficulty(state, userId, difficulty as any);

      // Step 2: submit answer (applies damage, transitions phase)
      state = submitAnswer(state, userId, answerIndex, isCorrect);
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Persist round to the BattleRound table
    const currentRound = state.rounds[state.rounds.length - 1];
    if (currentRound) {
      await this.prisma.battleRound.create({
        data: {
          battleId,
          roundNumber: currentRound.roundNumber,
          attackerId: userId,
          questionId,
          difficulty: difficulty as any,
          answerIndex,
          isCorrect,
          points: currentRound.pointsAwarded,
        },
      });

      // BC9: Update question answer statistics (fire-and-forget)
      this.questionService
        .updateAnswerStats(questionId, isCorrect)
        .catch((err) => this.logger.warn(`Failed to update answer stats for question ${questionId}: ${err.message}`));
    }

    await this.saveState(battleId, state);
    return state;
  }

  /**
   * Process a defense action.
   */
  async processDefense(
    battleId: string,
    userId: string,
    defenseType: string,
    success: boolean,
  ) {
    const state = await this.getBattleState(battleId);
    this.assertActive(battleId, state);

    try {
      const newState = submitDefense(state, userId, defenseType as any, success);

      // Update the BattleRound record with defense info
      const currentRound = newState.rounds[newState.rounds.length - 1];
      if (currentRound) {
        await this.prisma.battleRound.updateMany({
          where: {
            battleId,
            roundNumber: currentRound.roundNumber,
          },
          data: {
            defenseType: defenseType as any,
            points: currentRound.pointsAwarded,
          },
        });
      }

      await this.saveState(battleId, newState);
      return newState;
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Advance to the next phase / round. If the game is over, complete it.
   */
  async advanceRound(battleId: string) {
    const state = await this.getBattleState(battleId);
    this.assertActive(battleId, state);

    try {
      const newState = nextPhase(state);
      await this.saveState(battleId, newState);

      if (isGameOver(newState) || newState.phase === BattlePhase.FINAL_RESULT) {
        await this.completeBattle(battleId);
      }

      return newState;
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Complete the battle: compute result, update DB status, update user stats & rating.
   */
  async completeBattle(battleId: string) {
    const state = await this.getBattleState(battleId);
    let result: BattleResult;

    try {
      // Fetch real ratings for accurate ratingChange in BattleResult
      const [p1Stats, p2Stats] = await Promise.all([
        this.prisma.userStats.findUnique({ where: { userId: state.player1.id } }),
        state.player2.id !== 'bot'
          ? this.prisma.userStats.findUnique({ where: { userId: state.player2.id } })
          : null,
      ]);

      result = getResult(state, {
        player1Rating: p1Stats?.rating,
        player2Rating: p2Stats?.rating,
      });
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update the battle record
    await this.prisma.battle.update({
      where: { id: battleId },
      data: {
        status: 'COMPLETED',
        winnerId: result.winnerId,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        endedAt: new Date(),
      },
    });

    // Update player 1 stats (XP + rating)
    const p1Xp = result.xpGained[state.player1.id] ?? 0;
    const p1Won = result.winnerId === state.player1.id;
    await this.updateUserStats(
      state.player1.id,
      p1Xp,
      state.selectedCategory,
      p1Won,
      state.player2.id !== 'bot' ? state.player2.id : null,
    );

    // Update player 2 stats only if not a bot
    if (state.player2.id !== 'bot') {
      const p2Xp = result.xpGained[state.player2.id] ?? 0;
      const p2Won = result.winnerId === state.player2.id;
      await this.updateUserStats(
        state.player2.id,
        p2Xp,
        state.selectedCategory,
        p2Won,
        state.player1.id,
      );
    }

    return result;
  }

  /**
   * Handle a round timeout.
   */
  async handlePlayerTimeout(battleId: string) {
    const state = await this.getBattleState(battleId);
    this.assertActive(battleId, state);

    try {
      const newState = handleTimeout(state);
      await this.saveState(battleId, newState);
      return newState;
    } catch (err) {
      throw new HttpException(
        (err as Error).message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Handle player disconnect — opponent wins by forfeit.
   */
  async handlePlayerDisconnect(battleId: string, userId: string) {
    const state = await this.getBattleState(battleId);
    if (state.phase === BattlePhase.FINAL_RESULT) {
      return state;
    }

    const newState = handleDisconnect(state, userId);
    await this.saveState(battleId, newState);

    // Update battle status to ABANDONED and complete
    await this.prisma.battle.update({
      where: { id: battleId },
      data: { status: 'ABANDONED' },
    });

    await this.completeBattle(battleId);
    return newState;
  }

  // ── Private helpers ───────────────────────────

  /**
   * Save the BattleState JSON back to the DB.
   */
  private async saveState(battleId: string, state: BattleState) {
    await this.prisma.battle.update({
      where: { id: battleId },
      data: {
        state: state as unknown as Prisma.InputJsonValue,
        category: state.selectedCategory ?? undefined,
      },
    });
  }

  /**
   * Assert the battle is in an active status.
   */
  private assertActive(battleId: string, state: BattleState) {
    if (state.phase === BattlePhase.FINAL_RESULT) {
      throw new HttpException(
        'Battle is already finished',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Update a user's stats after battle completion (XP + ELO rating).
   */
  private async updateUserStats(
    userId: string,
    xpGained: number,
    category: string | undefined,
    won: boolean,
    opponentId: string | null,
  ) {
    // Determine which XP stat to increment based on category
    const xpField = this.categoryToXpField(category);

    // Calculate rating change if PvP
    let ratingDelta = 0;
    if (opponentId) {
      const [playerStats, opponentStats] = await Promise.all([
        this.prisma.userStats.findUnique({ where: { userId } }),
        this.prisma.userStats.findUnique({ where: { userId: opponentId } }),
      ]);

      const playerRating = playerStats?.rating ?? ELO_DEFAULT_RATING;
      const opponentRating = opponentStats?.rating ?? ELO_DEFAULT_RATING;
      ratingDelta = calculateRatingChange(playerRating, opponentRating, won);
    }

    await this.prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        [xpField]: xpGained,
        rating: ELO_DEFAULT_RATING + ratingDelta,
      },
      update: {
        [xpField]: { increment: xpGained },
        rating: { increment: ratingDelta },
      },
    });
  }

  /**
   * Map a category string to the corresponding XP field on UserStats.
   */
  private categoryToXpField(
    category: string | undefined,
  ): 'logicXp' | 'eruditionXp' | 'strategyXp' | 'rhetoricXp' | 'intuitionXp' {
    switch (category?.toLowerCase()) {
      case 'logic':
        return 'logicXp';
      case 'strategy':
        return 'strategyXp';
      case 'rhetoric':
        return 'rhetoricXp';
      case 'intuition':
        return 'intuitionXp';
      default:
        return 'eruditionXp';
    }
  }

  /**
   * Get distinct categories from the questions table.
   */
  private async getAvailableCategories(): Promise<string[]> {
    const result = await this.prisma.question.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });
    return result.map((q: { category: string }) => q.category);
  }
}
