import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class BulkValidateQuestionsDto {
  @ApiProperty({ type: [CreateQuestionDto], description: 'Массив вопросов для валидации' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
