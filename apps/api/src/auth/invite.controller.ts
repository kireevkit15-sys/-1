import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { randomBytes } from 'node:crypto';
import type { AuthenticatedRequest } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class CreateInviteDto {
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) maxUses?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) ttlDays?: number;
}

function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

@ApiTags('invites')
@ApiBearerAuth()
@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateInviteDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    const expiresAt = dto.ttlDays ? new Date(Date.now() + dto.ttlDays * 86400_000) : null;
    return this.prisma.inviteCode.create({
      data: {
        code: generateCode(),
        note: dto.note,
        maxUses: dto.maxUses ?? 1,
        expiresAt,
        createdById: req.user.sub,
      },
      select: { code: true, maxUses: true, expiresAt: true, createdAt: true },
    });
  }

  @Get('mine')
  async listMine(@Req() req: AuthenticatedRequest) {
    return this.prisma.inviteCode.findMany({
      where: { createdById: req.user.sub },
      orderBy: { createdAt: 'desc' },
      select: {
        code: true, note: true, maxUses: true, usedCount: true,
        expiresAt: true, createdAt: true,
        usedBy: { select: { name: true } },
      },
    });
  }

  @Get('validate/:code')
  async validate(@Req() req: AuthenticatedRequest) {
    const raw = req.params.code;
    const code = Array.isArray(raw) ? raw[0] : raw;
    if (!code) throw new NotFoundException('Invite code not found');
    const invite = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException('Invite code not found');
    const active = (!invite.expiresAt || invite.expiresAt > new Date()) && invite.usedCount < invite.maxUses;
    return { code: invite.code, active };
  }
}
