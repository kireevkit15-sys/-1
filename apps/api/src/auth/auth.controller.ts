import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { TokenPair } from './auth.service';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Throttle({ short: { ttl: 1000, limit: 2 }, medium: { ttl: 60000, limit: 5 }, long: { ttl: 3600000, limit: 60 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация по email' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Пользователь зарегистрирован, возвращена пара токенов' })
  @ApiResponse({ status: 409, description: 'Пользователь с таким email уже существует' })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<TokenPair> {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Вход по email' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Успешный вход, возвращена пара токенов' })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль' })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Вход через Telegram Widget' })
  @ApiBody({ type: TelegramLoginDto })
  @ApiResponse({ status: 201, description: 'Успешный вход через Telegram, возвращена пара токенов' })
  @ApiResponse({ status: 401, description: 'Невалидные данные Telegram' })
  @Post('telegram')
  async telegramLogin(@Body() dto: TelegramLoginDto): Promise<TokenPair> {
    return this.authService.telegramLogin(dto);
  }

  @ApiOperation({ summary: 'Обновить токены (refreshToken в Bearer)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Токены обновлены' })
  @ApiResponse({ status: 401, description: 'Невалидный или просроченный refresh токен' })
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Request() req: { user: JwtPayload }): Promise<TokenPair> {
    return this.authService.refresh(req.user);
  }
}
