import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { V2UserController } from './v2-user.controller';
import { V2BattleController } from './v2-battle.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [PrismaModule, AuthModule, StatsModule],
  controllers: [V2UserController, V2BattleController],
})
export class V2Module {}
