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

interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async telegramLogin(
    dto: TelegramLoginDto,
  ): Promise<{ accessToken: string }> {
    this.validateTelegramHash(dto);

    const telegramId = String(dto.id);
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      const displayName =
        [dto.first_name, dto.last_name].filter(Boolean).join(' ') ||
        dto.username ||
        `User${dto.id}`;

      user = await this.prisma.user.create({
        data: {
          telegramId,
          name: displayName,
          avatar: dto.photo_url || null,
        },
      });
    }

    return this.generateToken(user);
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
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
        password: hashedPassword,
        name: dto.name,
      },
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateToken(user);
  }

  private generateToken(user: {
    id: string;
    email?: string | null;
    role: string;
  }): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || undefined,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
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
      .map((key) => `${key}=${(data as Record<string, any>)[key]}`)
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

    // Check auth_date is not too old (allow 1 day)
    const authAge = Math.floor(Date.now() / 1000) - dto.auth_date;
    if (authAge > 86400) {
      throw new UnauthorizedException('Telegram auth data expired');
    }
  }
}
