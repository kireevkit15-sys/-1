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
  ApiResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { TrackEventDto } from './dto/track-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Отправить событие аналитики' })
  @ApiResponse({ status: 201, description: 'Событие записано' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('track')
  async track(
    @Request() req: { user: { sub: string } },
    @Body() dto: TrackEventDto,
  ) {
    await this.analyticsService.track(dto.type, req.user.sub, dto.payload);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Получить события (только админ)' })
  @ApiResponse({ status: 200, description: 'Список событий с пагинацией' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('events')
  async getEvents(@Query() query: QueryEventsDto) {
    return this.analyticsService.getEvents({
      type: query.type,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @ApiOperation({ summary: 'Агрегированная статистика по типам (только админ)' })
  @ApiResponse({ status: 200, description: 'Количество событий по типам' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('counts')
  async getCounts(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getEventCounts({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
