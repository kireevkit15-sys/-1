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

export class ChallengeAnswerDto {
  @ApiProperty({ description: 'ID вопроса', example: 'uuid' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ description: 'Индекс выбранного варианта (0–3)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}

export class SubmitChallengeDto {
  @ApiProperty({
    description: 'Массив ответов на 3 вопроса челленджа',
    type: [ChallengeAnswerDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ChallengeAnswerDto)
  answers!: ChallengeAnswerDto[];
}
