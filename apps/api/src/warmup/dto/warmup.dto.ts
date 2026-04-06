import {
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WarmupAnswerDto {
  @ApiProperty({ description: 'ID вопроса', example: 'uuid' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ description: 'Индекс выбранного варианта (0–3)', example: 2 })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}

export class SubmitWarmupDto {
  @ApiProperty({
    description: 'Массив ответов на 5 вопросов разминки',
    type: [WarmupAnswerDto],
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => WarmupAnswerDto)
  answers!: WarmupAnswerDto[];
}
