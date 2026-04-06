import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { TokenPair } from './auth.service';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация по email' })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<TokenPair> {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Вход по email' })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Вход через Telegram Widget' })
  @Post('telegram')
  async telegramLogin(@Body() dto: TelegramLoginDto): Promise<TokenPair> {
    return this.authService.telegramLogin(dto);
  }

  @ApiOperation({ summary: 'Обновить токены (refreshToken в Bearer)' })
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Request() req: { user: JwtPayload }): Promise<TokenPair> {
    return this.authService.refresh(req.user);
  }
}
