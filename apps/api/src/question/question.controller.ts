import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  CreateQuestionDto,
  BulkCreateQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';

@ApiTags('Questions')
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // ─── Public (JWT only) ────────────────────────────────────

  @ApiOperation({ summary: 'Получить случайные вопросы для батла' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'branch', required: false, description: 'Ветка знаний' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Сложность' })
  @ApiQuery({ name: 'category', required: false, description: 'Категория' })
  @ApiQuery({ name: 'excludeIds', required: false, description: 'ID для исключения (через запятую)' })
  @ApiQuery({ name: 'count', required: false, description: 'Количество вопросов (по умолчанию 5)' })
  @UseGuards(JwtAuthGuard)
  @Get('random')
  async getRandomForBattle(
    @Query('branch') branch?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
    @Query('excludeIds') excludeIds?: string,
    @Query('count') count?: string,
  ) {
    return this.questionService.getRandomForBattle({
      branch,
      difficulty,
      category,
      excludeIds: excludeIds ? excludeIds.split(',') : undefined,
      count: count ? parseInt(count, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Получить вопрос по ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  // ─── Admin only ───────────────────────────────────────────

  @ApiOperation({ summary: 'Список вопросов (админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.questionService.findAll({
      category,
      difficulty,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Создать вопрос (админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @ApiOperation({ summary: 'Массовое создание вопросов (админ)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('bulk')
  async bulkCreate(@Body() dto: BulkCreateQuestionsDto) {
    return this.questionService.bulkCreate(dto.questions);
  }

  @ApiOperation({ summary: 'Обновить вопрос (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }

  @ApiOperation({ summary: 'Мягкое удаление вопроса (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.questionService.softDelete(id);
  }
}
