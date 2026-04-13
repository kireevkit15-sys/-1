import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedService } from './feed.service';
import { FeedInteractDto } from './dto/feed-interact.dto';

@ApiTags('Feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @ApiOperation({
    summary: 'Получить дневной фид карточек (генерация или кеш)',
  })
  @ApiOkResponse({ description: 'Дневной фид с карточками, прогрессом и стриком' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  @Get('today')
  async getToday(@Request() req: { user: { sub: string } }) {
    return this.feedService.getDailyFeed(req.user.sub);
  }

  @ApiOperation({
    summary: 'Зафиксировать взаимодействие с карточкой (просмотр, ответ, пропуск)',
  })
  @ApiOkResponse({ description: 'Результат взаимодействия: XP, правильность, стрик' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или карточка не найдена' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  @Post('interact')
  async interact(
    @Request() req: { user: { sub: string } },
    @Body() dto: FeedInteractDto,
  ) {
    return this.feedService.interactWithCard(req.user.sub, dto.cardId, {
      type: dto.type,
      answerIndex: dto.answerIndex,
      timeTakenMs: dto.timeTakenMs,
    });
  }

  @ApiOperation({
    summary: 'Статистика фида: стрик, просмотрено сегодня, общий XP',
  })
  @ApiOkResponse({ description: 'Статистика фида пользователя' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован' })
  @Get('stats')
  async getStats(@Request() req: { user: { sub: string } }) {
    return this.feedService.getFeedStats(req.user.sub);
  }
}
