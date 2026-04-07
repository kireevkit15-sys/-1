import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementCategory } from '@prisma/client';

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @ApiOperation({ summary: 'Список всех достижений' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: AchievementCategory,
    description: 'Фильтр по категории',
  })
  @ApiResponse({ status: 200, description: 'Список достижений' })
  @Get()
  async findAll(@Query('category') category?: AchievementCategory) {
    return this.achievementsService.findAll(category);
  }

  @ApiOperation({ summary: 'Мои достижения с прогрессом' })
  @ApiResponse({ status: 200, description: 'Достижения пользователя с прогрессом и статусом разблокировки' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async getMyAchievements(@Request() req: { user: { sub: string } }) {
    return this.achievementsService.getUserAchievements(req.user.sub);
  }

  @ApiOperation({ summary: 'Счётчик разблокированных достижений' })
  @ApiResponse({ status: 200, description: '{ unlocked: number, total: number }' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/count')
  async getMyCount(@Request() req: { user: { sub: string } }) {
    return this.achievementsService.getUnlockedCount(req.user.sub);
  }
}
