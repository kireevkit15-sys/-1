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
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WarmupService } from './warmup.service';
import { SubmitWarmupDto } from './dto/warmup.dto';

@ApiTags('Warmup')
@Controller('warmup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WarmupController {
  constructor(private readonly warmupService: WarmupService) {}

  @ApiOperation({
    summary: 'Получить 5 вопросов разминки на сегодня (или результат, если уже делал)',
  })
  @ApiOkResponse({
    description: 'Вопросы разминки или результат, если уже выполнена сегодня',
  })
  @Get('today')
  async getToday(@Request() req: any) {
    return this.warmupService.getToday(req.user.sub);
  }

  @ApiOperation({
    summary: 'Отправить ответы на разминку и получить результат + стрик',
  })
  @ApiOkResponse({ description: 'Результат разминки с XP и стриком' })
  @ApiConflictResponse({ description: 'Разминка уже выполнена сегодня' })
  @ApiBadRequestResponse({
    description: 'Нет активной сессии разминки или некорректные вопросы',
  })
  @Post('submit')
  async submit(@Request() req: any, @Body() dto: SubmitWarmupDto) {
    return this.warmupService.submit(req.user.sub, dto.answers);
  }
}
