import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  CreateQuestionDto,
  BulkCreateQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';
import { CreateFeedbackDto } from './dto/question-feedback.dto';

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
  @ApiResponse({ status: 200, description: 'Список случайных вопросов' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
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

  @ApiOperation({ summary: 'Адаптивные вопросы для батла (DB + AI fallback)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['BRONZE', 'SILVER', 'GOLD'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Вопросы (из БД или сгенерированные)' })
  @UseGuards(JwtAuthGuard)
  @Get('adaptive')
  async getForBattle(
    @Query('branch') branch?: 'STRATEGY' | 'LOGIC',
    @Query('difficulty') difficulty?: 'BRONZE' | 'SILVER' | 'GOLD',
    @Query('category') category?: string,
    @Query('count') count?: string,
  ) {
    return this.questionService.getForBattle({
      branch,
      difficulty,
      category,
      count: count ? parseInt(count, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Получить вопрос по ID' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Вопрос найден' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Вопрос не найден' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  // ─── Feedback (BC8) ────────────────────────────────────────

  @ApiOperation({ summary: 'Отправить отзыв на вопрос (лайк/дизлайк/репорт)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 201, description: 'Отзыв сохранён' })
  @ApiResponse({ status: 404, description: 'Вопрос не найден' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/feedback')
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: CreateFeedbackDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.questionService.submitFeedback(
      id,
      req.user.sub,
      dto.type,
      dto.reason,
      dto.comment,
    );
  }

  @ApiOperation({ summary: 'Получить статистику отзывов на вопрос' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Статистика отзывов' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/feedback')
  async getFeedbackStats(@Param('id') id: string) {
    return this.questionService.getFeedbackStats(id);
  }

  // ─── Admin only ───────────────────────────────────────────

  @ApiOperation({ summary: 'Рекалибровка сложности вопросов (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Результат рекалибровки' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('recalibrate')
  async recalibrateDifficulty() {
    return this.questionService.recalibrateDifficulty();
  }

  @ApiOperation({ summary: 'Статистика ответов по вопросам (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Обзор статистики ответов' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('answer-stats')
  async getAnswerStats() {
    return this.questionService.getAnswerStatsOverview();
  }

  @ApiOperation({ summary: 'Статистика вопросов по категориям (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Количество вопросов по ветке, сложности, категории' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('stats')
  async getStats() {
    return this.questionService.getStatsByCategory();
  }

  @ApiOperation({ summary: 'Список вопросов (админ)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'category', required: false, description: 'Фильтр по категории' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Фильтр по сложности' })
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC'], description: 'Фильтр по ветке' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'], description: 'Фильтр по статусу' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество на странице' })
  @ApiResponse({ status: 200, description: 'Список вопросов с пагинацией' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('branch') branch?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.questionService.findAll({
      category,
      difficulty,
      branch,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Создать вопрос (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Вопрос создан' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @ApiOperation({ summary: 'Массовое создание вопросов (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Вопросы массово созданы' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('bulk')
  async bulkCreate(@Body() dto: BulkCreateQuestionsDto) {
    return this.questionService.bulkCreate(dto.questions);
  }

  @ApiOperation({ summary: 'Обновить вопрос (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Вопрос обновлён' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @ApiResponse({ status: 404, description: 'Вопрос не найден' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }

  @ApiOperation({ summary: 'Зарепорченные вопросы (админ)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Лимит (по умолчанию 20)' })
  @ApiResponse({ status: 200, description: 'Список зарепорченных вопросов' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('reported')
  async getReported(@Query('limit') limit?: string) {
    return this.questionService.getReportedQuestions(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @ApiOperation({ summary: 'Мягкое удаление вопроса (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Вопрос удалён (мягкое удаление)' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @ApiResponse({ status: 404, description: 'Вопрос не найден' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.questionService.softDelete(id);
  }
}
