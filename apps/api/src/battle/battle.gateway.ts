import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { BattleService } from './battle.service';
import { MatchmakingService } from './matchmaking.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
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
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly battleService: BattleService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      this.userSockets.set(payload.sub, client.id);
      this.logger.log(`Client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.delete(client.userId);
      await this.matchmakingService.removeFromQueue(client.userId);
      this.logger.log(`Client disconnected: ${client.userId}`);
    }
  }

  @SubscribeMessage('battle:join')
  async handleJoinBattle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string },
  ) {
    if (!client.userId) return;

    await client.join(`battle:${data.battleId}`);
    this.logger.log(`User ${client.userId} joined battle ${data.battleId}`);
  }

  @SubscribeMessage('battle:category')
  async handleCategorySelect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; category: string },
  ) {
    if (!client.userId) return;

    this.server
      .to(`battle:${data.battleId}`)
      .emit('battle:category_selected', {
        userId: client.userId,
        category: data.category,
      });
  }

  @SubscribeMessage('battle:difficulty')
  async handleDifficultySelect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; difficulty: string },
  ) {
    if (!client.userId) return;

    this.server
      .to(`battle:${data.battleId}`)
      .emit('battle:difficulty_selected', {
        userId: client.userId,
        difficulty: data.difficulty,
      });
  }

  @SubscribeMessage('battle:answer')
  async handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      battleId: string;
      answerId: string;
      defenseType: string | null;
    },
  ) {
    if (!client.userId) return;

    // Notify opponent that this player answered
    client
      .to(`battle:${data.battleId}`)
      .emit('battle:opponent_answered', { userId: client.userId });

    try {
      const result = await this.battleService.processRound(
        data.battleId,
        client.userId,
        data.answerId,
        data.defenseType,
      );

      // Emit round result to all players in the battle
      this.server
        .to(`battle:${data.battleId}`)
        .emit('battle:round_result', result);

      // Check if battle is complete
      const battle = await this.battleService.getBattle(data.battleId);
      if (battle && battle.status === 'COMPLETED') {
        this.server.to(`battle:${data.battleId}`).emit('battle:complete', {
          battleId: data.battleId,
          winnerId: battle.winnerId,
          player1Hp: battle.player1Hp,
          player2Hp: battle.player2Hp,
        });
      } else if (battle) {
        // Emit next round
        this.server.to(`battle:${data.battleId}`).emit('battle:round', {
          roundNumber: battle.currentRound,
          battleId: data.battleId,
        });
      }
    } catch (error: any) {
      client.emit('battle:error', {
        message: error.message || 'Failed to process answer',
      });
    }
  }

  @SubscribeMessage('battle:defend')
  async handleDefend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { battleId: string; defenseType: string },
  ) {
    if (!client.userId) return;

    client.to(`battle:${data.battleId}`).emit('battle:opponent_defended', {
      userId: client.userId,
      defenseType: data.defenseType,
    });
  }

  @SubscribeMessage('battle:matchmake')
  async handleMatchmaking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { rating: number; category?: string },
  ) {
    if (!client.userId) return;

    const match = await this.matchmakingService.findMatch(
      client.userId,
      data.rating,
    );

    if (match) {
      // Create a battle for the matched players
      const battle = await this.battleService.createBattle(
        client.userId,
        'matchmaking',
        data.category,
      );

      const opponentSocketId = this.userSockets.get(match.opponentId);

      // Notify both players
      client.emit('battle:matched', {
        battleId: battle.id,
        opponent: { id: match.opponentId },
      });

      if (opponentSocketId) {
        this.server.to(opponentSocketId).emit('battle:matched', {
          battleId: battle.id,
          opponent: { id: client.userId },
        });
      }
    } else {
      await this.matchmakingService.addToQueue(client.userId, data.rating);
      client.emit('battle:queued', { message: 'Searching for opponent...' });
    }
  }
}
