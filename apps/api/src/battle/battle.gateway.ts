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
import { QuestionService } from '../question/question.service';
import { StatsService } from '../stats/stats.service';
import {
  BattleState,
  BattlePhase,
  BattleMode,
  BotLevel,
  Branch,
  Difficulty,
  DefenseType,
  BattleResult,
  createBattle,
  selectCategory,
  selectBranch,
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

const BOT_PLAYER_ID = 'bot';

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

  /** battleId -> bot difficulty level for this battle */
  private botLevels = new Map<string, BotLevel>();

  /** userId -> matchmaking timeout timer (30 sec → offer bot) */
  private matchmakingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** battleId -> metadata of completed battles (kept 60s for rematch) */
  private completedBattleMeta = new Map<string, {
    player1: { id: string; name: string; avatarUrl?: string };
    player2: { id: string; name: string; avatarUrl?: string };
    mode: BattleMode;
    branch?: Branch;
  }>();

  /** battleId -> pending rematch request { requesterId, opponentId, timer } */
  private rematchRequests = new Map<string, {
    requesterId: string;
    opponentId: string;
    timer: ReturnType<typeof setTimeout>;
  }>();

  private readonly DISCONNECT_TIMEOUT_MS = 30_000;
  private readonly MATCHMAKING_TIMEOUT_MS = 30_000;
  private readonly MATCHMAKING_POLL_MS = 5_000;
  private readonly REMATCH_TIMEOUT_MS = 30_000;
  private readonly COMPLETED_META_TTL_MS = 60_000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly battleService: BattleService,
    private readonly matchmakingService: MatchmakingService,
    private readonly botService: BotService,
    private readonly questionService: QuestionService,
    private readonly statsService: StatsService,
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
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError';
      if (isExpired) {
        this.logger.warn(
          `Connection rejected: JWT expired. ` +
          `The existing disconnect handler will handle any active battle gracefully (30s reconnect window).`,
        );
      } else {
        this.logger.warn('Connection rejected: invalid token');
      }
      client.emit('battle:auth_error', {
        reason: isExpired ? 'token_expired' : 'invalid_token',
        message: isExpired
          ? 'Your session has expired. Please re-authenticate and reconnect.'
          : 'Authentication failed.',
      });
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
  // battle:refresh_token — Refresh JWT without disconnecting
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:refresh_token')
  async handleRefreshToken(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const payload = await this.jwtService.verifyAsync(data.token);
      const oldUserId = client.data.userId;
      client.data.userId = payload.sub;

      // Update socket mapping if userId changed (shouldn't, but safety)
      if (oldUserId && oldUserId !== payload.sub) {
        this.userSockets.delete(oldUserId);
      }
      this.userSockets.set(payload.sub, client.id);

      client.emit('battle:token_refreshed', { success: true });
      this.logger.log(`Token refreshed for user ${payload.sub}`);
    } catch (err: any) {
      client.emit('battle:auth_error', {
        reason: 'invalid_token',
        message: 'Token refresh failed. Please re-authenticate.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:create_bot — Start a battle against the bot
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:create_bot')
  async handleCreateBotBattle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { botLevel?: BotLevel },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const botLevel = data?.botLevel ?? BotLevel.STANDARD;

    try {
      // Validate that there are categories with questions before starting
      const availableCategories = await this.questionService.getAvailableCategories();
      if (availableCategories.length === 0) {
        client.emit('battle:error', { message: 'No questions available. Cannot start a battle.' });
        return;
      }
      const categories = availableCategories.length >= 3
        ? availableCategories.slice(0, 6)
        : availableCategories;

      // Persist the battle shell in the database
      const dbBattle = await this.battleService.createBotBattle(userId);

      // Fetch user info for the state machine
      const fullBattle = await this.battleService.getBattle(dbBattle.id);
      const player1 = fullBattle?.player1 ?? { id: userId, name: 'Player' };

      const botName = this.botService.getBotName(botLevel);

      // Create in-memory state via shared state machine
      const state = createBattle(
        { id: player1.id, name: player1.name, avatarUrl: player1.avatarUrl ?? undefined },
        { id: BOT_PLAYER_ID, name: botName, avatarUrl: undefined },
        BattleMode.SIEGE,
        categories,
        { idGenerator: () => dbBattle.id },
      );

      this.battles.set(dbBattle.id, state);
      this.botLevels.set(dbBattle.id, botLevel);
      this.userBattles.set(userId, dbBattle.id);

      await client.join(`battle:${dbBattle.id}`);

      client.emit('battle:started', state);
      this.logger.log(`Bot battle created: ${dbBattle.id} for user ${userId}, level: ${botLevel}`);
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
  // battle:branch — Select a branch for the current round (attacker chooses)
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:branch')
  async handleBranchSelect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; branch: Branch },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const state = this.battles.get(data.battleId);
    if (!state) {
      client.emit('battle:error', { message: 'Battle not found' });
      return;
    }

    try {
      const updated = selectBranch(state, data.branch);
      this.battles.set(data.battleId, updated);

      this.server.to(`battle:${data.battleId}`).emit('battle:phase_changed', updated);

      // Start round timer for the attack phase
      this.startRoundTimer(data.battleId);

      // If this is a bot battle and the bot is the attacker, auto-attack
      if (this.isBotBattle(updated) && updated.currentAttackerId === BOT_PLAYER_ID) {
        this.scheduleBotAttack(data.battleId);
      }
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to select branch' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:category — Select a category for the current round (backward compat)
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
      if (this.isBotBattle(updated) && updated.currentAttackerId === BOT_PLAYER_ID) {
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

      // Step 2: Submit the answer — verify against question's correctIndex
      let isCorrect = false;
      try {
        const question = await this.questionService.findOne(data.questionId);
        isCorrect = data.answerIndex === question.correctIndex;
      } catch {
        this.logger.warn(`Question ${data.questionId} not found during battle attack`);
      }
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

      // If bot battle and bot needs to pick branch, schedule it
      if (this.isBotBattle(state) && (state.phase === BattlePhase.BRANCH_SELECT || state.phase === BattlePhase.CATEGORY_SELECT)) {
        // The attacker picks branch. If bot is attacker, auto-select.
        if (state.currentAttackerId === BOT_PLAYER_ID) {
          this.scheduleBotBranchSelect(data.battleId);
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
    @MessageBody() data: { rating?: number; branch?: Branch },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const branch = data.branch;

    // Use branch-specific ELO when a branch is provided, otherwise overall rating
    const rating = data.rating ?? await this.statsService.getBranchRating(userId, branch);

    try {
      const match = await this.matchmakingService.findMatch(userId, rating, branch);

      if (match) {
        // Create a PvP battle
        const dbBattle = await this.battleService.createPvpBattle(userId);

        // Fetch player data
        const fullBattle = await this.battleService.getBattle(dbBattle.id);
        const player1Info = fullBattle?.player1 ?? { id: userId, name: 'Player 1' };

        const state = createBattle(
          { id: player1Info.id, name: player1Info.name, avatarUrl: player1Info.avatarUrl ?? undefined },
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
        await this.matchmakingService.addToQueue(userId, rating, branch);
        this.matchmakingUsers.add(userId);
        client.emit('battle:queued', { message: 'Searching for opponent...', branch });

        // Start matchmaking timeout — after 30 sec offer bot
        this.startMatchmakingTimer(userId, rating, client, branch);
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

  // ---------------------------------------------------------------------------
  // battle:create_sparring — Create a friendly match and get an invite code
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:create_sparring')
  async handleCreateSparring(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const { battle, inviteCode } = await this.battleService.createSparringBattle(userId);

      // Track the host in userBattles so reconnect logic works
      this.userBattles.set(userId, battle.id);
      await client.join(`battle:${battle.id}`);

      client.emit('battle:sparring_created', {
        battleId: battle.id,
        inviteCode,
      });

      this.logger.log(`Sparring created: ${battle.id}, invite: ${inviteCode}, host: ${userId}`);
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to create sparring' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:join_sparring — Join a friend's sparring match via invite code
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:join_sparring')
  async handleJoinSparring(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { inviteCode: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const invite = await this.battleService.resolveInviteCode(data.inviteCode);
      if (!invite) {
        client.emit('battle:error', { message: 'Invalid or expired invite code' });
        return;
      }

      if (invite.hostId === userId) {
        client.emit('battle:error', { message: 'Cannot join your own sparring match' });
        return;
      }

      // Fetch both players
      const fullBattle = await this.battleService.getBattle(invite.battleId);
      const host = fullBattle?.player1 ?? { id: invite.hostId, name: 'Host' };

      const availableCategories = await this.questionService.getAvailableCategories();
      const categories = availableCategories.length >= 3
        ? availableCategories.slice(0, 6)
        : availableCategories;

      // Create the in-memory state as SPARRING
      const state = createBattle(
        { id: host.id, name: host.name, avatarUrl: host.avatarUrl ?? undefined },
        { id: userId, name: 'Opponent' },
        BattleMode.SPARRING,
        categories,
        { idGenerator: () => invite.battleId },
      );

      this.battles.set(invite.battleId, state);
      this.userBattles.set(userId, invite.battleId);
      await client.join(`battle:${invite.battleId}`);

      // Notify both players
      this.server.to(`battle:${invite.battleId}`).emit('battle:started', state);

      this.logger.log(`Sparring ${invite.battleId}: ${userId} joined via code ${data.inviteCode}`);
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to join sparring' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:request_rematch — Propose a rematch after battle ends
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:request_rematch')
  async handleRequestRematch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const meta = this.completedBattleMeta.get(data.battleId);
    if (!meta) {
      client.emit('battle:error', { message: 'Battle not found or rematch window expired' });
      return;
    }

    // Determine opponent
    const opponentId = meta.player1.id === userId ? meta.player2.id : meta.player2.id === userId ? meta.player1.id : null;
    if (!opponentId || opponentId === 'bot') {
      client.emit('battle:error', { message: 'Cannot request rematch for this battle' });
      return;
    }

    // Check if a request already exists
    if (this.rematchRequests.has(data.battleId)) {
      client.emit('battle:error', { message: 'Rematch already requested' });
      return;
    }

    // Start 30s timeout
    const timer = setTimeout(() => {
      this.rematchRequests.delete(data.battleId);
      const requesterSocketId = this.userSockets.get(userId);
      if (requesterSocketId) {
        this.server.to(requesterSocketId).emit('battle:rematch_expired', { battleId: data.battleId });
      }
      this.logger.log(`Rematch request expired for battle ${data.battleId}`);
    }, this.REMATCH_TIMEOUT_MS);

    this.rematchRequests.set(data.battleId, { requesterId: userId, opponentId, timer });

    // Notify opponent
    const opponentSocketId = this.userSockets.get(opponentId);
    if (opponentSocketId) {
      this.server.to(opponentSocketId).emit('battle:rematch_offered', {
        battleId: data.battleId,
        requesterId: userId,
        timeoutMs: this.REMATCH_TIMEOUT_MS,
      });
    }

    client.emit('battle:rematch_pending', { battleId: data.battleId, timeoutMs: this.REMATCH_TIMEOUT_MS });
    this.logger.log(`Rematch requested: battle ${data.battleId}, by ${userId} → ${opponentId}`);
  }

  // ---------------------------------------------------------------------------
  // battle:accept_rematch — Accept the rematch proposal
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:accept_rematch')
  async handleAcceptRematch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const request = this.rematchRequests.get(data.battleId);
    if (!request || request.opponentId !== userId) {
      client.emit('battle:error', { message: 'No pending rematch request' });
      return;
    }

    clearTimeout(request.timer);
    this.rematchRequests.delete(data.battleId);

    const meta = this.completedBattleMeta.get(data.battleId);
    if (!meta) {
      client.emit('battle:error', { message: 'Rematch window expired' });
      return;
    }

    try {
      // Create a new PvP battle
      const dbBattle = await this.battleService.createPvpBattle(request.requesterId);

      const availableCategories = await this.questionService.getAvailableCategories();
      const categories = availableCategories.length >= 3
        ? availableCategories.slice(0, 6)
        : availableCategories;

      // Swap roles — previous player2 becomes player1 in rematch
      const state = createBattle(
        { id: meta.player2.id, name: meta.player2.name, avatarUrl: meta.player2.avatarUrl },
        { id: meta.player1.id, name: meta.player1.name, avatarUrl: meta.player1.avatarUrl },
        meta.mode === BattleMode.SPARRING ? BattleMode.SPARRING : BattleMode.SIEGE,
        categories,
        { idGenerator: () => dbBattle.id },
      );

      this.battles.set(dbBattle.id, state);
      this.userBattles.set(request.requesterId, dbBattle.id);
      this.userBattles.set(userId, dbBattle.id);

      // Join both players to the new room
      const requesterSocketId = this.userSockets.get(request.requesterId);
      if (requesterSocketId) {
        this.server.in(requesterSocketId).socketsJoin(`battle:${dbBattle.id}`);
      }
      await client.join(`battle:${dbBattle.id}`);

      // Notify both
      this.server.to(`battle:${dbBattle.id}`).emit('battle:rematch_started', {
        battleId: dbBattle.id,
        originalBattleId: data.battleId,
      });
      this.server.to(`battle:${dbBattle.id}`).emit('battle:started', state);

      this.logger.log(`Rematch accepted: new battle ${dbBattle.id} from ${data.battleId}`);
    } catch (error: any) {
      client.emit('battle:error', { message: error.message ?? 'Failed to create rematch' });
    }
  }

  // ---------------------------------------------------------------------------
  // battle:decline_rematch — Decline the rematch proposal
  // ---------------------------------------------------------------------------

  @SubscribeMessage('battle:decline_rematch')
  async handleDeclineRematch(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const request = this.rematchRequests.get(data.battleId);
    if (!request || request.opponentId !== userId) {
      client.emit('battle:error', { message: 'No pending rematch request' });
      return;
    }

    clearTimeout(request.timer);
    this.rematchRequests.delete(data.battleId);

    // Notify requester
    const requesterSocketId = this.userSockets.get(request.requesterId);
    if (requesterSocketId) {
      this.server.to(requesterSocketId).emit('battle:rematch_declined', {
        battleId: data.battleId,
        declinedBy: userId,
      });
    }

    client.emit('battle:rematch_declined_ack', { battleId: data.battleId });
    this.logger.log(`Rematch declined: battle ${data.battleId}, by ${userId}`);
  }

  private startMatchmakingTimer(userId: string, rating: number, client: AuthenticatedSocket, branch?: Branch) {
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

      // Try to find a match with expanding range (branch-aware)
      const match = await this.matchmakingService.findMatch(userId, rating, branch);
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
    return state.player2.id === BOT_PLAYER_ID;
  }

  private getBotLevel(battleId: string): BotLevel {
    return this.botLevels.get(battleId) ?? BotLevel.STANDARD;
  }

  private scheduleBotBranchSelect(battleId: string) {
    const level = this.getBotLevel(battleId);
    const delay = this.botService.getThinkingDelay(level);
    const timer = setTimeout(() => {
      const state = this.battles.get(battleId);
      if (!state || (state.phase !== BattlePhase.BRANCH_SELECT && state.phase !== BattlePhase.CATEGORY_SELECT)) return;

      // Bot picks a random branch
      const branch = state.branches[Math.floor(Math.random() * state.branches.length)]!;

      try {
        const updated = selectBranch(state, branch);
        this.battles.set(battleId, updated);
        this.server.to(`battle:${battleId}`).emit('battle:phase_changed', updated);
        this.startRoundTimer(battleId);

        // Bot is attacker, so schedule the attack
        this.scheduleBotAttack(battleId);
      } catch (err: any) {
        this.logger.error(`Bot branch select failed: ${err.message}`);
      }
    }, delay);
    this.botTimers.set(battleId, timer);
  }

  private scheduleBotAttack(battleId: string) {
    const level = this.getBotLevel(battleId);
    const delay = this.botService.getThinkingDelay(level);
    const timer = setTimeout(() => {
      let state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.ROUND_ATTACK) return;
      if (state.currentAttackerId !== BOT_PLAYER_ID) return;

      try {
        this.clearRoundTimer(battleId);

        const difficulty = this.botService.chooseDifficulty(level);
        state = chooseDifficulty(state, BOT_PLAYER_ID, difficulty);

        // Bot "answers" — use bot accuracy logic
        const botAnswer = this.botService.chooseAnswer(0, 4, level);
        const answerIndex = botAnswer.answerIndex;

        state = submitAnswer(state, BOT_PLAYER_ID, answerIndex, botAnswer.isCorrect);
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
    const level = this.getBotLevel(battleId);
    const delay = this.botService.getThinkingDelay(level);
    const timer = setTimeout(() => {
      let state = this.battles.get(battleId);
      if (!state || state.phase !== BattlePhase.ROUND_DEFENSE) return;
      if (state.currentDefenderId !== BOT_PLAYER_ID) return;

      try {
        const defenseType: DefenseType = this.botService.chooseDefense(level);

        const success = this.resolveDefenseSuccess(defenseType);
        state = submitDefense(state, BOT_PLAYER_ID, defenseType, success);
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

        // If bot is the attacker for the new round, schedule branch select + attack
        if ((state.phase === BattlePhase.BRANCH_SELECT || state.phase === BattlePhase.CATEGORY_SELECT) && state.currentAttackerId === BOT_PLAYER_ID) {
          this.scheduleBotBranchSelect(battleId);
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

      // Store completed battle metadata for rematch (60s TTL)
      this.completedBattleMeta.set(battleId, {
        player1: { ...state.player1 },
        player2: { ...state.player2 },
        mode: state.mode,
        branch: state.selectedBranch as Branch | undefined,
      });
      setTimeout(() => this.completedBattleMeta.delete(battleId), this.COMPLETED_META_TTL_MS);

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
        const isSparring = state.mode === BattleMode.SPARRING;
        this.logger.log(
          `Battle ${battleId} completed${isSparring ? ' (sparring, no rating change)' : ''}. ` +
          `Winner: ${result.winnerId ?? 'draw'}. Score: ${result.player1Score}-${result.player2Score}`,
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
    this.botLevels.delete(battleId);

    // Remove user-battle associations
    for (const [uid, bid] of this.userBattles) {
      if (bid === battleId) {
        this.userBattles.delete(uid);
      }
    }
  }
}
