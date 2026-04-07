import { IsEnum } from 'class-validator';
import { Branch } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetModulesQueryDto {
  @ApiProperty({ enum: Branch, description: 'Branch: STRATEGY or LOGIC' })
  @IsEnum(Branch)
  branch!: Branch;
}
