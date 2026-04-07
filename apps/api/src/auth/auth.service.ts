import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'razum-refresh-secret',
    );
    this.refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '30d',
    );
  }

  async telegramLogin(dto: TelegramLoginDto): Promise<TokenPair> {
    this.validateTelegramHash(dto);

    const telegramId = BigInt(dto.id);
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (user?.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (!user) {
      const displayName =
        [dto.first_name, dto.last_name].filter(Boolean).join(' ') ||
        dto.username ||
        `User${dto.id}`;

      user = await this.prisma.user.create({
        data: {
          telegramId,
          name: displayName,
          avatarUrl: dto.photo_url || null,
          stats: { create: {} },
        },
      });
    }

    return this.generateTokenPair(user);
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new HttpException(
        'User with this email already exists',
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        name: dto.name,
        stats: { create: {} },
      },
    });

    return this.generateTokenPair(user);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokenPair(user);
  }

  async refresh(payload: JwtPayload): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user);
  }

  private generateTokenPair(user: {
    id: string;
    email?: string | null;
    role: string;
  }): TokenPair {
    const basePayload = {
      sub: user.id,
      email: user.email || undefined,
      role: user.role,
    };

    const accessToken = this.jwtService.sign({
      ...basePayload,
      type: 'access',
    });

    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
      },
    );

    return { accessToken, refreshToken };
  }

  private validateTelegramHash(dto: TelegramLoginDto): void {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new HttpException(
        'Telegram bot token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const { hash, ...data } = dto;
    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${(data as Record<string, unknown>)[key]}`)
      .join('\n');

    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest();

    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (hmac !== hash) {
      throw new UnauthorizedException('Invalid Telegram login hash');
    }

    const authAge = Math.floor(Date.now() / 1000) - dto.auth_date;
    if (authAge > 86400) {
      throw new UnauthorizedException('Telegram auth data expired');
    }
  }
}
