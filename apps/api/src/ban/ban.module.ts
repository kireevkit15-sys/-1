import { Module } from '@nestjs/common';
import { BanController } from './ban.controller';
import { BanService } from './ban.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BanController],
  providers: [BanService],
  exports: [BanService],
})
export class BanModule {}
