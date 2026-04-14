import { IsUUID, IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InteractionType {
  VIEW = 'VIEW',
  ANSWER = 'ANSWER',
  DEEPER = 'DEEPER',
  COMPLETE = 'COMPLETE',
}

export class InteractDto {
  @ApiProperty({ description: 'Learning day ID' })
  @IsUUID()
  dayId!: string;

  @ApiProperty({ description: 'Card index within the day', minimum: 0 })
  @IsInt()
  @Min(0)
  cardIndex!: number;

  @ApiProperty({ enum: InteractionType, description: 'Type of interaction' })
  @IsEnum(InteractionType)
  type!: InteractionType;

  @ApiPropertyOptional({ description: 'Time spent on card in ms' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentMs?: number;

  @ApiPropertyOptional({ description: 'Answer data (for ANSWER type)' })
  @IsOptional()
  @IsString()
  answer?: string;
}
