import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FeedbackTypeDto {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
  REPORT = 'REPORT',
}

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackTypeDto, description: 'Feedback type' })
  @IsEnum(FeedbackTypeDto)
  type!: FeedbackTypeDto;

  @ApiPropertyOptional({
    description: 'Report reason: incorrect_answer, unclear_question, offensive, other',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional comment from user' })
  @IsOptional()
  @IsString()
  comment?: string;
}
