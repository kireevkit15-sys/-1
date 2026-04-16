import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from './ai.service';
import type { SocraticMessage } from './ai.service';
import type { CreateDialogueDto } from './dto/create-dialogue.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type { GetDialoguesQueryDto } from './dto/get-dialogues-query.dto';

const MAX_EXCHANGES = 10;
const DAILY_DIALOGUE_LIMIT = 5;
const DAILY_LIMIT_TTL = 86400; // 24 hours

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiService: AiService,
  ) {}

  // ── POST /ai/dialogue — start a new dialogue ─────────────────────

  @Post('dialogue')
  @ApiOperation({ summary: 'Start a new AI dialogue (1 per day for free users)' })
  async createDialogue(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDialogueDto,
  ) {
    const userId = req.user.sub;

    // Check daily limit via Redis
    const today = new Date().toISOString().slice(0, 10);
    const limitKey = `ai:dialogue:limit:${userId}:${today}`;
    const used = await this.redis.get(limitKey);

    if (used && parseInt(used, 10) >= DAILY_DIALOGUE_LIMIT) {
      throw new ForbiddenException(
        'Дневной лимит AI-диалогов исчерпан. Попробуйте завтра.',
      );
    }

    // B17.5: Check daily token quota
    const quota = await this.aiService.checkDailyQuota(userId);
    if (quota.exceeded) {
      throw new ForbiddenException(
        `Дневной лимит токенов AI исчерпан (${quota.used}/${quota.limit}). Попробуйте завтра.`,
      );
    }

    // Get user stats for level context
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });
    const userLevel = userStats
      ? Math.floor(
          (userStats.logicXp +
            userStats.strategyXp +
            userStats.eruditionXp +
            userStats.rhetoricXp +
            userStats.intuitionXp) /
            500,
        ) + 1
      : 1;

    // Call AI
    const messages: SocraticMessage[] = [
      { role: 'user', content: dto.message },
    ];

    const aiResponse = await this.aiService.socraticChat({
      topic: dto.topic,
      branch: 'STRATEGY',
      userLevel,
      messages,
      userId,
    });

    // Save dialogue
    const allMessages = [
      { role: 'user', content: dto.message },
      { role: 'assistant', content: aiResponse },
    ];

    const dialogue = await this.prisma.aiDialogue.create({
      data: {
        userId,
        topic: dto.topic,
        messages: allMessages,
        tokenCount: 0, // token counting is inside AiService logs
      },
    });

    // Increment daily limit
    const currentCount = used ? parseInt(used, 10) : 0;
    await this.redis.set(limitKey, String(currentCount + 1), DAILY_LIMIT_TTL);

    return {
      id: dialogue.id,
      topic: dialogue.topic,
      messages: allMessages,
      createdAt: dialogue.createdAt,
    };
  }

  // ── POST /ai/dialogue/:id/message — continue a dialogue ──────────

  @Post('dialogue/:id/message')
  @ApiOperation({ summary: 'Send a message to an existing AI dialogue' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const userId = req.user.sub;

    const dialogue = await this.prisma.aiDialogue.findUnique({
      where: { id },
    });

    if (!dialogue) {
      throw new NotFoundException('Диалог не найден');
    }

    if (dialogue.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }

    const existingMessages = dialogue.messages as unknown as SocraticMessage[];
    const exchangeCount = existingMessages.filter(
      (m) => m.role === 'user',
    ).length;

    if (exchangeCount >= MAX_EXCHANGES) {
      throw new ConflictException(
        `Достигнут лимит сообщений (${MAX_EXCHANGES}). Начните новый диалог.`,
      );
    }

    // B17.5: Check daily token quota
    const quota = await this.aiService.checkDailyQuota(userId);
    if (quota.exceeded) {
      throw new ForbiddenException(
        `Дневной лимит токенов AI исчерпан (${quota.used}/${quota.limit}). Попробуйте завтра.`,
      );
    }

    // Get user stats for level context
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });
    const userLevel = userStats
      ? Math.floor(
          (userStats.logicXp +
            userStats.strategyXp +
            userStats.eruditionXp +
            userStats.rhetoricXp +
            userStats.intuitionXp) /
            500,
        ) + 1
      : 1;

    // Build full message history for AI context
    const messages: SocraticMessage[] = [
      ...existingMessages,
      { role: 'user', content: dto.message },
    ];

    const aiResponse = await this.aiService.socraticChat({
      topic: dialogue.topic,
      branch: 'STRATEGY',
      userLevel,
      messages,
      userId,
    });

    // Append new messages
    const updatedMessages = [
      ...existingMessages,
      { role: 'user', content: dto.message },
      { role: 'assistant', content: aiResponse },
    ];

    await this.prisma.aiDialogue.update({
      where: { id },
      data: { messages: updatedMessages },
    });

    return {
      id: dialogue.id,
      topic: dialogue.topic,
      messages: updatedMessages,
      exchangesUsed: exchangeCount + 1,
      exchangesLeft: MAX_EXCHANGES - exchangeCount - 1,
    };
  }

  // ── GET /ai/dialogue/:id — get dialogue history ──────────────────

  @Get('dialogue/:id')
  @ApiOperation({ summary: 'Get AI dialogue by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getDialogue(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const dialogue = await this.prisma.aiDialogue.findUnique({
      where: { id },
    });

    if (!dialogue) {
      throw new NotFoundException('Диалог не найден');
    }

    if (dialogue.userId !== req.user.sub) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }

    const messages = dialogue.messages as unknown as SocraticMessage[];
    const exchangeCount = messages.filter((m) => m.role === 'user').length;

    return {
      id: dialogue.id,
      topic: dialogue.topic,
      messages,
      exchangesUsed: exchangeCount,
      exchangesLeft: MAX_EXCHANGES - exchangeCount,
      tokenCount: dialogue.tokenCount,
      createdAt: dialogue.createdAt,
    };
  }

  // ── GET /ai/dialogues — list user's dialogues ─────────────────────

  @Get('dialogues')
  @ApiOperation({ summary: 'List user AI dialogues (paginated)' })
  async getDialogues(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetDialoguesQueryDto,
  ) {
    const userId = req.user.sub;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [dialogues, total] = await Promise.all([
      this.prisma.aiDialogue.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          topic: true,
          tokenCount: true,
          createdAt: true,
          messages: true,
        },
      }),
      this.prisma.aiDialogue.count({ where: { userId } }),
    ]);

    return {
      data: dialogues.map((d) => {
        const msgs = d.messages as unknown as SocraticMessage[];
        return {
          id: d.id,
          topic: d.topic,
          messageCount: msgs.length,
          tokenCount: d.tokenCount,
          createdAt: d.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── B17.4: Token usage admin endpoint ─────────────────────────────

  @Get('tokens/usage')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Token usage summary (admin only)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Period in days (default 7)' })
  @ApiResponse({ status: 200, description: 'Token usage by day, operation, and user' })
  async getTokenUsage(@Query('days') days?: string) {
    return this.aiService.getTokenUsageSummary(days ? parseInt(days, 10) : 7);
  }

  // ── B17.5: User daily quota check ─────────────────────────────────

  @Get('quota')
  @ApiOperation({ summary: 'Check remaining daily AI quota for current user' })
  @ApiResponse({ status: 200, description: 'Daily token quota status' })
  async getMyQuota(@Request() req: AuthenticatedRequest) {
    return this.aiService.checkDailyQuota(req.user.sub);
  }
}
