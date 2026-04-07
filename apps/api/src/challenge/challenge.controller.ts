import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengeService } from './challenge.service';
import { SubmitChallengeDto } from './dto/submit-challenge.dto';

@ApiTags('Challenge')
@Controller('challenge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @ApiOperation({
    summary: 'Получить ежедневный челлендж (или результат, если уже выполнен)',
  })
  @ApiOkResponse({
    description: 'Вопросы челленджа или результат',
  })
  @Get('today')
  async getToday(@Request() req: { user: { sub: string } }) {
    return this.challengeService.getToday(req.user.sub);
  }

  @ApiOperation({
    summary: 'Отправить ответы на челлендж',
  })
  @ApiOkResponse({ description: 'Результат челленджа с XP' })
  @ApiConflictResponse({ description: 'Челлендж уже выполнен сегодня' })
  @ApiBadRequestResponse({ description: 'Нет активного челленджа или некорректные данные' })
  @Post('submit')
  async submit(
    @Request() req: { user: { sub: string } },
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.challengeService.submit(req.user.sub, dto.answers);
  }

  @ApiOperation({ summary: 'История выполненных челленджей' })
  @ApiOkResponse({ description: 'Список прошлых челленджей с пагинацией' })
  @Get('history')
  async getHistory(
    @Request() req: { user: { sub: string } },
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.challengeService.getHistory(
      req.user.sub,
      limit ? parseInt(limit, 10) : undefined,
      page ? parseInt(page, 10) : undefined,
    );
  }
}
