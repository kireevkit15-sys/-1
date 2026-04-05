import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { BattleService } from './battle.service';
import { MatchmakingService } from './matchmaking.service';
import { BotService } from './bot.service';
import {
  BattleState,
  BattlePhase,
  BattleMode,
  Difficulty,
  DefenseType,
  BattleResult,
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
  ROUND_TIME_LIMIT,
} from '@razum/shared';

const BOT_PLAYER = {
  id: 'bot',
  name: 'РАЗУМ-бот',
  avatarUrl: undefined,
};

const DEFAULT_CATEGORIES = [
  'Математика',
  'Физика',
  'История',
  'Литература',
  'Биология',
  'География',
];

interface AuthenticatedSocket extends Socket {
  data: { userId?: string };
}

@WebSocketGateway({
  namespace: '/battle',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class BattleGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BattleGateway.name);

  /** userId -> socketId */
  private userSockets = new Map<string, string>();

  /** battleId -> in-memory BattleState */
  private battles = new Map<string, BattleState>();

  /** battleId -> round timer handle */
  private roundTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** battleId -> bot action timer handle */
  private botTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** userId -> true (in matchmaking queue) */
  private matchmakingUsers = new Set<string>();

  /** userId -> battleId (tracks which battle a user is currently in) */
  private userBattles = new Map<string, string>();

  /** userId -> disconnect timer (30 sec reconnect window) */
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** userId -> matchmaking timeout timer (30 sec → offer bot) */
  private matchmakingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly DISCONNECT_TIMEOUT_MS = 30_000;
  private readonly MATCHMAKING_TIMEOUT_MS = 30_000;
  private readonly MATCHMAKING_POLL_MS = 5_000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly battleService: BattleService,
    private readonly matchmakingService: MatchmakingService,
    private readonly botService: BotService,
  ) {}

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Connection rejected: no token');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      this.logger.log(`Client connected: ${payload.sub}`);

      // Check if this is a reconnection during an active battle
      await this.handleReconnect(payload.sub, client);
    } catch {
      this.logger.warn('Connection rejected: invalid token');
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.userSockets.delete(userId);
    this.logger.log(`Client disconnected: ${userId}`);

    // Remove from matchmaking
    if (this.matchmakingUsers.has(userId)) {
      this.matchmakingUsers.delete(userId);
      this.clearMatchmakingTimer(userId);
      await this.matchmakingService.removeFromQueue(userId);
    }

    // Handle active battle disconnect — 30 sec reconnect window
    const battleId = this.userBattles.get(userId);
    if (battleId) {
      const state = this.battles.get(battleId);
      if (state && state.phase !== BattlePhase.FINAL_RESULT && !this.isBotBattle(state)) {
        // Notify opponent that player disconnected
        this.server.to(`battle:${battleId}`).emit('battle:opponent_disconnected', {
          userId,
          timeoutSeconds: this.DISCONNECT_TIMEOUT_MS / 1000,
        });

        // Start 30-sec timer — if player doesn't reconnect, forfeit
        const timer = setTimeout(async () => {
          this.disconnectTimers.delete(userId);
          const currentState = this.battles.get(battleId);
          if (currentState && currentState.phase !== BattlePhase.FINAL_RESULT) {
            // Player didn't reconnect — forfeit
            const updated = handleDisconnect(currentState, userId);
            this.battles.set(battleId, updated);
            this.clearTimers(battleId);

            const result = getResult(updated);
            this.server.to(`battle:${battleId}`).emit('battle:complete', result);
            await this.persistBattleResult(battleId, updated, result);
            this.cleanupBattle(battleId);
            this.logger.log(`Player ${userId} forfeited battle ${battleId} (disconnect timeout)`);
          }
        }, this.DISCONNECT_TIMEOUT_MS);

        this.disconnectTimers.set(userId, timer);
      } else if (state && this.isBotBattle(state)) {
        // Bot battles: forfeit immediately on disconnect
        const updated = handleDisconnect(state, userId);
        this.battles.set(battleId, updated);
        this.clearTimers(battleId);
        this.cleanupBattle(battleId);
      }
    }
  }

  /**
   * Handle reconnection — cancel disconnect timer if player comes back.
   */
  async handleReconnect(userId: string, client: AuthenticatedSocket) {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
      this.logger.log(`Player ${userId} reconnected, disconnect timer cancelled`);

      // Rejoin battle room
      const battleId = this.userBattles.get(userId);
      if (battleId) {
        await client.join(`battle:${battleId}`);
        const state = this.battles.get(battleId);
        if (state) {
          client.emit('battle:state', state);
          this.server.to(`battle:${battleId}`).emit('battle:opponent_reconnected', { userId });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // battle:create_bot — Start a battle against the bot
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:create_bot')
  async handleCreateBotBattle(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      // Persist the battle shell in the database
      const dbBattle = await this.battleService.createBotBattle(userId);

      // Fetch user info for the state machine
      const fullBattle = await this.battleService.getBattle(dbBattle.id);
      const player1 = fullBattle?.player1 ?? { id: userId, name: 'Player' };

      // Create in-memory state via shared state machine
      const state = createBattle(
        { id: player1.id, name: player1.name, avatarUrl: (player1 as any).avatar },
        BOT_PLAYER,
        BattleMode.SIEGE,
        DEFAULT_CATEGORIES,
        { idGenerator: () => dbBattle.id },
      );

      this.battles.set(dbBattle.id, state);
      this.userBattles.set(userId, dbBattle.id);

      await client.join(`battle:${dbBattle.id}`);

      client.emit('battle:started', state);
      this.logger.log(`Bot battle created: ${dbBattle.id} for user ${userId}`);
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to create bot battle' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:join — Join an existing battle room
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:join')
  async handleJoinBattle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await client.join(`battle:${data.battleId}`);
    this.userBattles.set(userId, data.battleId);

    const state = this.battles.get(data.battleId);
    if (state) {
      client.emit('battle:state', state);
    }

    this.logger.log(`User ${userId} joined battle ${data.battleId}`);
  }

  // ---------------------------------------------------------------------------
  // battle:category — Select a category for the current round
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:category')
  async handleCategorySelect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; category: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const state = this.battles.get(data.battleId);
    if (!state) {
      client.emit('battle:error', { message: 'Battle not found' });
      return;
    }

    try {
      const updated = selectCategory(state, data.category);
      this.battles.set(data.battleId, updated);

      this.server.to(`battle:${data.battleId}`).emit('battle:phase_changed', updated);

      // Start round timer for the attack phase
      this.startRoundTimer(data.battleId);

      // If this is a bot battle and the bot is the attacker, auto-attack
      if (this.isBotBattle(updated) && updated.currentAttackerId === BOT_PLAYER.id) {
        this.scheduleBotAttack(data.battleId);
      }
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to select category' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:attack — Submit an attack (choose difficulty + answer)
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:attack')
  async handleAttack(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      battleId: string;
      difficulty: Difficulty;
      answerIndex: number;
      questionId: string;
    },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    let state = this.battles.get(data.battleId);
    if (!state) {
      client.emit('battle:error', { message: 'Battle not found' });
      return;
    }

    try {
      this.clearRoundTimer(data.battleId);

      // Step 1: Choose difficulty (creates the round entry)
      state = chooseDifficulty(state, userId, data.difficulty);

      // Update the round with questionId
      const lastRound = state.rounds[state.rounds.length - 1];
      if (lastRound) {
        lastRound.questionId = data.questionId;
      }

      // Step 2: Submit the answer
      // For now we determine correctness on the client or question service;
      // accept the answerIndex as-is and mark correctness based on questionId.
      // The gateway trusts the answer index — server-side validation can be added.
      const isCorrect = data.answerIndex === 0; // placeholder: real check uses question data
      state = submitAnswer(state, userId, data.answerIndex, isCorrect);
      this.battles.set(data.battleId, state);

      this.server.to(`battle:${data.battleId}`).emit('battle:round_update', state);

      // Handle post-attack flow for bot battles
      if (this.isBotBattle(state)) {
        if (state.phase === BattlePhase.ROUND_DEFENSE) {
          // Bot needs to defend — auto-defend after delay
          this.scheduleBotDefense(data.battleId);
        } else if (state.phase === BattlePhase.ROUND_RESULT) {
          // Attack missed, skip to next round after brief delay
          this.scheduleBotAdvanceRound(data.battleId);
        }
      } else {
        // PvP: start defense timer
        if (state.phase === BattlePhase.ROUND_DEFENSE) {
          this.startRoundTimer(data.battleId);
        }
      }
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to process attack' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:defend — Submit a defense action
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:defend')
  async handleDefend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; defenseType: DefenseType },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    let state = this.battles.get(data.battleId);
    if (!state) {
      client.emit('battle:error', { message: 'Battle not found' });
      return;
    }

    try {
      this.clearRoundTimer(data.battleId);

      // Determine defense success probability
      const success = this.resolveDefenseSuccess(data.defenseType);

      state = submitDefense(state, userId, data.defenseType, success);
      this.battles.set(data.battleId, state);

      this.server.to(`battle:${data.battleId}`).emit('battle:round_update', state);

      // Check for game over
      if (isGameOver(state)) {
        await this.finalizeBattle(data.battleId);
        return;
      }

      // Advance round
      state = nextPhase(state);
      this.battles.set(data.battleId, state);
      this.server.to(`battle:${data.battleId}`).emit('battle:phase_changed', state);

      // If SWAP_ROLES, advance again to CATEGORY_SELECT after a brief moment
      if (state.phase === BattlePhase.SWAP_ROLES) {
        state = nextPhase(state);
        this.battles.set(data.battleId, state);
        this.server.to(`battle:${data.battleId}`).emit('battle:phase_changed', state);
      }

      // If bot battle and bot needs to pick category, schedule it
      if (this.isBotBattle(state) && state.phase === BattlePhase.CATEGORY_SELECT) {
        // The attacker picks category. If bot is attacker, auto-select.
        if (state.currentAttackerId === BOT_PLAYER.id) {
          this.scheduleBotCategorySelect(data.battleId);
        }
      }
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to process defense' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:matchmake — Enter the matchmaking queue
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:matchmake')
  async handleMatchmaking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rating?: number },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const rating = data.rating ?? 1000;

    try {
      const match = await this.matchmakingService.findMatch(userId, rating);

      if (match) {
        // Create a PvP battle
        const dbBattle = await this.battleService.createPvpBattle(userId);

        // Fetch player data
        const fullBattle = await this.battleService.getBattle(dbBattle.id);
        const player1Info = fullBattle?.player1 ?? { id: userId, name: 'Player 1' };

        const state = createBattle(
          { id: player1Info.id, name: player1Info.name, avatarUrl: (player1Info as any).avatar },
          { id: match.opponentId, name: 'Opponent' },
          BattleMode.SIEGE,
          DEFAULT_CATEGORIES,
          { idGenerator: () => dbBattle.id },
        );

        this.battles.set(dbBattle.id, state);
        this.userBattles.set(userId, dbBattle.id);
        this.userBattles.set(match.opponentId, dbBattle.id);
        this.matchmakingUsers.delete(userId);
        this.matchmakingUsers.delete(match.opponentId);

        // Notify the initiating player
        client.emit('battle:matched', {
          battleId: dbBattle.id,
          opponent: { id: match.opponentId },
        });

        // Notify the opponent
        const opponentSocketId = this.userSockets.get(match.opponentId);
        if (opponentSocketId) {
          this.server.to(opponentSocketId).emit('battle:matched', {
            battleId: dbBattle.id,
            opponent: { id: userId },
          });
        }
      } else {
        // No immediate match — add to queue and start polling + timeout
        await this.matchmakingService.addToQueue(userId, rating);
        this.matchmakingUsers.add(userId);
        client.emit('battle:queued', { message: 'Searching for opponent...' });

        // Start matchmaking timeout — after 30 sec offer bot
        this.startMatchmakingTimer(userId, rating, client);
      }
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Matchmaking failed' });
    }
  }

  @SubscribeMessage('battle:cancel_matchmake')
  async handleCancelMatchmaking(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.matchmakingUsers.delete(userId);
    this.clearMatchmakingTimer(userId);
    await this.matchmakingService.removeFromQueue(userId);
    client.emit('battle:matchmaking_cancelled');
  }

  private startMatchmakingTimer(userId: string, rating: number, client: AuthenticatedSocket) {
    this.clearMatchmakingTimer(userId);

    // Poll every 5 seconds with expanding range
    let elapsed = 0;
    const interval = setInterval(async () => {
      elapsed += this.MATCHMAKING_POLL_MS;

      // Check if still in queue
      if (!this.matchmakingUsers.has(userId)) {
        clearInterval(interval);
        this.matchmakingTimers.delete(userId);
        return;
      }

      // Try to find a match with expanding range
      const match = await this.matchmakingService.findMatch(userId, rating);
      if (match) {
        clearInterval(interval);
        this.matchmakingTimers.delete(userId);
        this.matchmakingUsers.delete(userId);

        // Create PvP battle (same logic as above)
        const dbBattle = await this.battleService.createPvpBattle(userId);
        const state = createBattle(
          { id: userId, name: 'Player 1' },
          { id: match.opponentId, name: 'Player 2' },
          BattleMode.SIEGE,
          DEFAULT_CATEGORIES,
          { idGenerator: () => dbBattle.id },
        );

        this.battles.set(dbBattle.id, state);
        this.userBattles.set(userId, dbBattle.id);
        this.userBattles.set(match.opponentId, dbBattle.id);

        client.emit('battle:matched', { battleId: dbBattle.id, opponent: { id: match.opponentId } });
        const opponentSocketId = this.userSockets.get(match.opponentId);
        if (opponentSocketId) {
          this.server.to(opponentSocketId).emit('battle:matched', { battleId: dbBattle.id, opponent: { id: userId } });
        }
        return;
      }

      // Timeout — offer bot match
      if (elapsed >= this.MATCHMAKING_TIMEOUT_MS) {
        clearInterval(interval);
        this.matchmakingTimers.delete(userId);
        this.matchmakingUsers.delete(userId);
        await this.matchmakingService.removeFromQueue(userId);

        client.emit('battle:matchmaking_timeout', {
          message: 'No opponent found. Play against bot?',
          timeoutMs: this.MATCHMAKING_TIMEOUT_MS,
        });
      }
    }, this.MATCHMAKING_POLL_MS);

    this.matchmakingTimers.set(userId, interval as any);
  }

  private clearMatchmakingTimer(userId: string) {
    const timer = this.matchmakingTimers.get(userId);
    if (timer) {
      clearInterval(timer as any);
      this.matchmakingTimers.delete(userId);
    }
  }

  // ---------------------------------------------------------------------------
  // Bot automation helpers
  // ---------------------------------------------------------------------------

  private isBotBattle(state: BattleState): boolean {
    return state.player2.id === BOT_PLAYER.id;
  }

  private scheduleBotCategorySelect(battleId: string) {
    const delay = this.botService.getThinkingDelay();
    const timer = setTimeout(() => {
      const state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.CATEGORY_SELECT) return;

      const category =
        state.categories[Math.floor(Math.random() * state.categories.length)]!;

      try {
        const updated = selectCategory(state, category);
        this.battles.set(battleId, updated);
        this.server.to(`battle:${battleId}`).emit('battle:phase_changed', updated);
        this.startRoundTimer(battleId);

        // Bot is attacker, so schedule the attack
        this.scheduleBotAttack(battleId);
      } catch (err: any) {
        this.logger.error(`Bot category select failed: ${err.message}`);
      }
    }, delay);
    this.botTimers.set(battleId, timer);
  }

  private scheduleBotAttack(battleId: string) {
    const delay = this.botService.getThinkingDelay();
    const timer = setTimeout(() => {
      let state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.ROUND_ATTACK) return;
      if (state.currentAttackerId !== BOT_PLAYER.id) return;

      try {
        this.clearRoundTimer(battleId);

        const difficulty = this.botService.chooseDifficulty();
        state = chooseDifficulty(state, BOT_PLAYER.id, difficulty);

        // Bot "answers" — use bot accuracy logic
        const botAnswer = this.botService.chooseAnswer(0, 4);
        const answerIndex = botAnswer.answerIndex;

        state = submitAnswer(state, BOT_PLAYER.id, answerIndex, botAnswer.isCorrect);
        this.battles.set(battleId, state);

        this.server.to(`battle:${battleId}`).emit('battle:round_update', state);

        if (state.phase === BattlePhase.ROUND_DEFENSE) {
          // Human player needs to defend — start timer
          this.startRoundTimer(battleId);
        } else if (state.phase === BattlePhase.ROUND_RESULT) {
          // Bot missed, advance round
          this.scheduleBotAdvanceRound(battleId);
        }
      } catch (err: any) {
        this.logger.error(`Bot attack failed: ${err.message}`);
      }
    }, delay);
    this.botTimers.set(battleId, timer);
  }

  private scheduleBotDefense(battleId: string) {
    const delay = this.botService.getThinkingDelay();
    const timer = setTimeout(() => {
      let state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.ROUND_DEFENSE) return;
      if (state.currentDefenderId !== BOT_PLAYER.id) return;

      try {
        const defenseType: DefenseType = this.botService.chooseDefense();

        const success = this.resolveDefenseSuccess(defenseType);
        state = submitDefense(state, BOT_PLAYER.id, defenseType, success);
        this.battles.set(battleId, state);

        this.server.to(`battle:${battleId}`).emit('battle:round_update', state);

        if (isGameOver(state)) {
          this.finalizeBattle(battleId);
          return;
        }

        // Advance to next phase
        this.scheduleBotAdvanceRound(battleId);
      } catch (err: any) {
        this.logger.error(`Bot defense failed: ${err.message}`);
      }
    }, delay);
    this.botTimers.set(battleId, timer);
  }

  private scheduleBotAdvanceRound(battleId: string) {
    const delay = 1500; // brief pause before advancing
    const timer = setTimeout(() => {
      let state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.ROUND_RESULT) return;

      try {
        if (isGameOver(state)) {
          this.finalizeBattle(battleId);
          return;
        }

        state = nextPhase(state);
        this.battles.set(battleId, state);
        this.server.to(`battle:${battleId}`).emit('battle:phase_changed', state);

        // If SWAP_ROLES, advance once more
        if (state.phase === BattlePhase.SWAP_ROLES) {
          state = nextPhase(state);
          this.battles.set(battleId, state);
          this.server.to(`battle:${battleId}`).emit('battle:phase_changed', state);
        }

        // If bot is the attacker for the new round, schedule category + attack
        if (state.phase === BattlePhase.CATEGORY_SELECT && state.currentAttackerId === BOT_PLAYER.id) {
          this.scheduleBotCategorySelect(battleId);
        }
      } catch (err: any) {
        this.logger.error(`Bot advance round failed: ${err.message}`);
      }
    }, delay);
    this.botTimers.set(battleId, timer);
  }

  // ---------------------------------------------------------------------------
  // Round timer
  // ---------------------------------------------------------------------------

  private startRoundTimer(battleId: string) {
    this.clearRoundTimer(battleId);

    const timer = setTimeout(() => {
      const state = this.battles.get(battleId);
      if (!state) return;
      if (state.phase !== BattlePhase.ROUND_ATTACK && state.phase !== BattlePhase.ROUND_DEFENSE) return;

      try {
        const updated = handleTimeout(state);
        this.battles.set(battleId, updated);
        this.server.to(`battle:${battleId}`).emit('battle:round_update', updated);

        if (isGameOver(updated)) {
          this.finalizeBattle(battleId);
        } else if (this.isBotBattle(updated)) {
          this.scheduleBotAdvanceRound(battleId);
        }
      } catch (err: any) {
        this.logger.error(`Round timer handler failed: ${err.message}`);
      }
    }, ROUND_TIME_LIMIT * 1000);

    this.roundTimers.set(battleId, timer);
  }

  private clearRoundTimer(battleId: string) {
    const timer = this.roundTimers.get(battleId);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(battleId);
    }
  }

  // ---------------------------------------------------------------------------
  // Defense success resolution
  // ---------------------------------------------------------------------------

  private resolveDefenseSuccess(defenseType: DefenseType): boolean {
    switch (defenseType) {
      case DefenseType.ACCEPT:
        return true; // ACCEPT always "succeeds" (damage passes through)
      case DefenseType.DISPUTE:
        return Math.random() < 0.5;
      case DefenseType.COUNTER:
        return Math.random() < 0.3;
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Battle finalization
  // ---------------------------------------------------------------------------

  private async finalizeBattle(battleId: string) {
    let state = this.battles.get(battleId);
    if (!state) return;

    // Ensure we are in FINAL_RESULT
    if (state.phase !== BattlePhase.FINAL_RESULT) {
      state = {
        ...state,
        phase: BattlePhase.FINAL_RESULT,
        endedAt: Date.now(),
      };
      this.battles.set(battleId, state);
    }

    this.clearTimers(battleId);

    try {
      const result = getResult(state);
      this.server.to(`battle:${battleId}`).emit('battle:complete', result);

      await this.persistBattleResult(battleId, state, result);
    } catch (err: any) {
      this.logger.error(`Failed to finalize battle ${battleId}: ${err.message}`);
    }

    this.cleanupBattle(battleId);
  }

  private async persistBattleResult(
    battleId: string,
    state: BattleState,
    result: BattleResult,
  ) {
    try {
      // Delegate persistence to the existing BattleService / Prisma layer.
      // The processRound method already handles DB updates for the old flow,
      // but for the new state-machine flow we just need to mark completion.
      // This is a best-effort save; the in-memory state is the source of truth
      // during gameplay.
      const battle = await this.battleService.getBattle(battleId);
      if (battle) {
        // The service will be extended to support this; for now log it.
        this.logger.log(
          `Battle ${battleId} completed. Winner: ${result.winnerId ?? 'draw'}. ` +
          `Score: ${result.player1Score}-${result.player2Score}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to persist battle result: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private clearTimers(battleId: string) {
    this.clearRoundTimer(battleId);
    const botTimer = this.botTimers.get(battleId);
    if (botTimer) {
      clearTimeout(botTimer);
      this.botTimers.delete(battleId);
    }
  }

  private cleanupBattle(battleId: string) {
    this.battles.delete(battleId);

    // Remove user-battle associations
    for (const [uid, bid] of this.userBattles) {
      if (bid === battleId) {
        this.userBattles.delete(uid);
      }
    }
  }
}
