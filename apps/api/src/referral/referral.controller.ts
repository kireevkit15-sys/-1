import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import type { ApplyReferralDto } from './dto/apply-referral.dto';

@ApiTags('Referral')
@Controller('referral')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @ApiOperation({ summary: 'Получить свой реферальный код и ссылку' })
  @ApiResponse({ status: 200, description: '{ code, link }' })
  @Get('my-code')
  async getMyCode(@Request() req: AuthenticatedRequest) {
    return this.referralService.getMyCode(req.user.sub);
  }

  @ApiOperation({ summary: 'Применить реферальный код (ввести код друга)' })
  @ApiResponse({ status: 201, description: 'Код применён, XP начислен обоим' })
  @ApiResponse({ status: 404, description: 'Код не найден' })
  @ApiResponse({ status: 400, description: 'Нельзя использовать свой код' })
  @ApiResponse({ status: 409, description: 'Код уже был использован' })
  @Post('apply')
  async apply(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.referralService.apply(req.user.sub, dto.code);
  }

  @ApiOperation({ summary: 'Статистика рефералов (сколько пригласил, XP)' })
  @ApiResponse({ status: 200, description: 'Статистика рефералов' })
  @Get('stats')
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.referralService.getStats(req.user.sub);
  }
}
