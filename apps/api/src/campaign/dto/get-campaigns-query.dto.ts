import { IsEnum, IsOptional } from 'class-validator';
import { Branch } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCampaignsQueryDto {
  @ApiPropertyOptional({
    enum: Branch,
    description: 'Filter by branch: STRATEGY, LOGIC, ERUDITION, RHETORIC, or INTUITION',
  })
  @IsOptional()
  @IsEnum(Branch)
  branch?: Branch;
}
