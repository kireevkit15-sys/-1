import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Мой профиль' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.userService.getMe(req.user.sub);
  }

  @ApiOperation({ summary: 'Обновить профиль' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateMe(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Публичный профиль пользователя' })
  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(id);
  }
}
