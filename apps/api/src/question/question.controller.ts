import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  BulkCreateQuestionsDto,
  UpdateQuestionDto,
} from './dto/create-question.dto';

@Controller('questions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

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

  @Post('bulk')
  async bulkCreate(@Body() dto: BulkCreateQuestionsDto) {
    return this.questionService.bulkCreate(dto.questions);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }
}
