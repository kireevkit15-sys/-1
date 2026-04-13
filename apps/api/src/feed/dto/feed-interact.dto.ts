import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { FeedInteractionType } from '@razum/shared';

export class FeedInteractDto {
  @ApiProperty({ description: 'ID карточки фида', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  cardId!: string;

  @ApiProperty({
    description: 'Тип взаимодействия',
    enum: FeedInteractionType,
    example: FeedInteractionType.ANSWERED_CORRECT,
  })
  @IsEnum(FeedInteractionType)
  type!: FeedInteractionType;

  @ApiPropertyOptional({ description: 'Индекс выбранного ответа (для CHALLENGE/SPARRING/FORGE)', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  answerIndex?: number;

  @ApiPropertyOptional({ description: 'Время ответа в миллисекундах', example: 4200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeTakenMs?: number;
}
