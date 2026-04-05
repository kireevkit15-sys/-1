import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BattleService } from './battle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateBattleDto {
  @IsEnum(['bot', 'matchmaking'])
  mode!: 'bot' | 'matchmaking';

  @IsOptional()
  @IsString()
  category?: string;
}

@Controller('battles')
@UseGuards(JwtAuthGuard)
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post()
  async createBattle(@Request() req: any, @Body() dto: CreateBattleDto) {
    return this.battleService.createBattle(req.user.sub, dto.mode, dto.category);
  }

  @Get(':id')
  async getBattle(@Param('id') id: string, @Request() req: any) {
    const battle = await this.battleService.getBattle(id);
    if (!battle) {
      throw new HttpException('Battle not found', HttpStatus.NOT_FOUND);
    }
    return battle;
  }

  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = Math.min(parseInt(limit || '20', 10), 100);
    return this.battleService.getUserBattleHistory(
      req.user.sub,
      pageNum,
      limitNum,
    );
  }
}
