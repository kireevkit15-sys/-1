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
import type { QuestionService } from './question.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import type {
  CreateQuestionDto,
  BulkCreateQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';
import type { CreateFeedbackDto } from './dto/question-feedback.dto';
import type { GenerateQuestionsDto } from './dto/generate-questions.dto';
import type { BulkValidateQuestionsDto } from './dto/bulk-validate.dto';

@ApiTags('Questions')
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // ─── Public ───────────────────────────────────────────────

  @ApiOperation({ summary: 'Получить случайные вопросы для батла' })
  @ApiQuery({ name: 'branch', required: false, description: 'Ветка знаний' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Сложность' })
  @ApiQuery({ name: 'category', required: false, description: 'Категория' })
  @ApiQuery({ name: 'excludeIds', required: false, description: 'ID для исключения (через запятую)' })
  @ApiQuery({ name: 'count', required: false, description: 'Количество вопросов (по умолчанию 5)' })
  @ApiResponse({ status: 200, description: 'Список случайных вопросов' })
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
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['BRONZE', 'SILVER', 'GOLD'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'count', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Вопросы (из БД или сгенерированные)' })
  @UseGuards(JwtAuthGuard)
  @Get('adaptive')
  async getForBattle(
    @Query('branch') branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION',
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

  // ─── B14.1: AI Question Generation ─────────────────────────────

  @ApiOperation({ summary: 'AI-генерация вопросов по категории/ветке (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Вопросы сгенерированы' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('generate')
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    return this.questionService.generateQuestions({
      category: dto.category,
      branch: dto.branch,
      difficulty: dto.difficulty,
      count: dto.count || 5,
      subcategory: dto.subcategory,
      topic: dto.topic,
      saveToDB: dto.saveToDB,
    });
  }

  // ─── B14.2: Coverage Gaps ─────────────────────────────────────

  @ApiOperation({ summary: 'Анализ покрытия вопросов по ветке/сложности (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Матрица покрытия и пробелы' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('gaps')
  async getCoverageGaps() {
    return this.questionService.getCoverageGaps();
  }

  // ─── B14.3: Bulk Validate ─────────────────────────────────────

  @ApiOperation({ summary: 'Пакетная валидация вопросов перед загрузкой (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Результат валидации' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('bulk-validate')
  async bulkValidate(@Body() dto: BulkValidateQuestionsDto) {
    return this.questionService.bulkValidate(dto.questions);
  }

  // ─── B14.4: Export ────────────────────────────────────────────

  @ApiOperation({ summary: 'Экспорт вопросов в JSON (админ)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['BRONZE', 'SILVER', 'GOLD'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'JSON с вопросами' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('export')
  async exportQuestions(
    @Query('branch') branch?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.questionService.exportQuestions({
      branch,
      difficulty,
      category,
      isActive: includeInactive === 'true' ? undefined : true,
    });
  }

  // ─── B14.5: Auto-rotation ────────────────────────────────────

  @ApiOperation({ summary: 'Автоматическая ротация плохих вопросов (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Результат ротации' })
  @ApiResponse({ status: 403, description: 'Нет прав администратора' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('auto-rotate')
  async autoRotateQuestions() {
    return this.questionService.autoRotateQuestions();
  }

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
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'], description: 'Фильтр по ветке' })
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

  // ─── B14.6: Tags ───────────────────────────────────────────

  @ApiOperation({ summary: 'Все теги с количеством вопросов (админ)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Список тегов' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('tags')
  async getAllTags() {
    return this.questionService.getAllTags();
  }

  @ApiOperation({ summary: 'Поиск вопросов по тегам (админ)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'tags', required: true, description: 'Теги через запятую' })
  @ApiQuery({ name: 'matchAll', required: false, type: Boolean, description: 'Все теги должны совпасть' })
  @ApiResponse({ status: 200, description: 'Список вопросов' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('by-tags')
  async findByTags(
    @Query('tags') tags: string,
    @Query('matchAll') matchAll?: string,
  ) {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    return this.questionService.findByTags(tagList, matchAll === 'true');
  }

  @ApiOperation({ summary: 'Установить теги на вопрос (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Теги обновлены' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/tags')
  async setTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ) {
    return this.questionService.setTags(id, body.tags);
  }

  // ─── B19.5: Moderation queue ────────────────────────────────

  @ApiOperation({ summary: 'Очередь модерации: зарепорченные вопросы с деталями (админ)' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Очередь модерации' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('moderation/queue')
  async getModerationQueue(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.questionService.getModerationQueue({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Отклонить репорты на вопрос — вопрос в порядке (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Репорты отклонены' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/moderation/dismiss')
  async dismissReports(@Param('id') id: string) {
    return this.questionService.dismissReports(id);
  }

  @ApiOperation({ summary: 'Деактивировать вопрос по результатам модерации (админ)' })
  @ApiBearerAuth()
  @ApiParam({ name: 'id', description: 'UUID вопроса' })
  @ApiResponse({ status: 200, description: 'Вопрос деактивирован' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/moderation/deactivate')
  async moderateDeactivate(@Param('id') id: string) {
    return this.questionService.moderateDeactivate(id);
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
