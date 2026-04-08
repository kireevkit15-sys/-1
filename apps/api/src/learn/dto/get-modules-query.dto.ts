import { IsEnum } from 'class-validator';
import { Branch } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetModulesQueryDto {
  @ApiProperty({ enum: Branch, description: 'Branch: STRATEGY, LOGIC, ERUDITION, RHETORIC, or INTUITION' })
  @IsEnum(Branch)
  branch!: Branch;
}
