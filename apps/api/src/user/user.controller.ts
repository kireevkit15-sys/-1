import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Мой профиль',
    description:
      'Возвращает полный профиль с обогащёнными статами, статистикой батлов и историей',
  })
  @ApiQuery({
    name: 'battleLimit',
    required: false,
    type: Number,
    description: 'Количество последних батлов (по умолчанию 10)',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Профиль текущего пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @Request() req: AuthenticatedRequest,
    @Query('battleLimit', new DefaultValuePipe(10), ParseIntPipe)
    battleLimit: number,
  ) {
    return this.userService.getMe(req.user.sub, battleLimit);
  }

  @ApiOperation({ summary: 'Обновить профиль' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: AuthenticatedRequest, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Удалить аккаунт',
    description: 'Soft-delete: анонимизирует PII и помечает аккаунт как удалённый',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Аккаунт удалён' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(@Request() req: AuthenticatedRequest) {
    return this.userService.deleteMe(req.user.sub);
  }

  @ApiOperation({
    summary: 'Публичный профиль пользователя',
    description:
      'Возвращает публичный профиль с обогащёнными статами и статистикой батлов',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({ status: 200, description: 'Публичный профиль пользователя' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }

  @ApiOperation({
    summary: 'Сравнение профилей (экран VS)',
    description:
      'Сравнивает текущего пользователя с другим: XP по веткам, уровни, рейтинги, класс мыслителя, личная статистика встреч',
  })
  @ApiParam({ name: 'id', description: 'UUID оппонента' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Данные сравнения двух профилей' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/compare')
  async compareProfiles(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.userService.compareProfiles(req.user.sub, id);
  }

  // ─── B19.7: GDPR export/import ────────────────────────────

  @ApiOperation({
    summary: 'Экспорт всех данных пользователя (GDPR)',
    description: 'JSON dump: профиль, статы, батлы, достижения, диалоги, разминки',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Полный JSON-дамп данных пользователя' })
  @UseGuards(JwtAuthGuard)
  @Get('me/export')
  async exportData(@Request() req: AuthenticatedRequest) {
    return this.userService.exportUserData(req.user.sub);
  }

  @ApiOperation({
    summary: 'Импорт данных профиля (только имя и аватар)',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  @UseGuards(JwtAuthGuard)
  @Post('me/import')
  async importData(
    @Request() req: AuthenticatedRequest,
    @Body() body: { name?: string; avatarUrl?: string },
  ) {
    return this.userService.importUserData(req.user.sub, body);
  }
}
