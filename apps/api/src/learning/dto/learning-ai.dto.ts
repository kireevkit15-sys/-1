import { IsString, IsUUID, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConceptExplainDto {
  @ApiProperty({ description: 'ID концепта для объяснения' })
  @IsUUID()
  conceptId!: string;

  @ApiPropertyOptional({ description: 'Конкретный вопрос пользователя' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  question?: string;
}

export class BarrierHintDto {
  @ApiProperty({ description: 'ID барьера' })
  @IsUUID()
  barrierId!: string;

  @ApiProperty({ description: 'ID концепта, по которому нужна подсказка' })
  @IsUUID()
  conceptId!: string;

  @ApiProperty({ description: 'Текущий этап барьера', enum: ['recall', 'connect', 'apply', 'defend'] })
  @IsString()
  stage!: 'recall' | 'connect' | 'apply' | 'defend';

  @ApiPropertyOptional({ description: 'Текущая попытка ответа' })
  @IsOptional()
  @IsString()
  userAttempt?: string;
}

export class GenerateQuizDto {
  @ApiProperty({ description: 'ID концепта для генерации квиза' })
  @IsUUID()
  conceptId!: string;

  @ApiPropertyOptional({ description: 'Количество вопросов (3-5)', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(5)
  count?: number;
}
