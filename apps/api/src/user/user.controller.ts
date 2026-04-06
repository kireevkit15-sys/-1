import {
  Controller,
  Get,
  Patch,
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
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

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
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @Request() req: any,
    @Query('battleLimit', new DefaultValuePipe(10), ParseIntPipe)
    battleLimit: number,
  ) {
    return this.userService.getMe(req.user.sub, battleLimit);
  }

  @ApiOperation({ summary: 'Обновить профиль' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Публичный профиль пользователя',
    description:
      'Возвращает публичный профиль с обогащёнными статами и статистикой батлов',
  })
  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }
}
