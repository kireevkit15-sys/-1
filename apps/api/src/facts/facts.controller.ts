import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { FactsService } from './facts.service';
import type { CreateFactDto } from './dto/create-fact.dto';

@ApiTags('Facts')
@Controller('facts')
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

  @ApiOperation({ summary: 'Получить факт дня' })
  @ApiOkResponse({ description: 'Факт дня' })
  @Get('today')
  async getFactOfTheDay() {
    return this.factsService.getFactOfTheDay();
  }

  @ApiOperation({ summary: 'Добавить факт (только админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreateFactDto) {
    return this.factsService.create(dto);
  }

  @ApiOperation({ summary: 'Список фактов (только админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('branch') branch?: string,
  ) {
    return this.factsService.findAll({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      branch,
    });
  }
}
