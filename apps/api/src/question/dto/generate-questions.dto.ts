import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Branch, Difficulty } from '@prisma/client';

export class GenerateQuestionsDto {
  @ApiProperty({ description: 'Категория вопросов (на русском)', example: 'Когнитивные искажения' })
  @IsString()
  category!: string;

  @ApiProperty({ enum: Branch, description: 'Ветка знаний' })
  @IsEnum(Branch)
  branch!: Branch;

  @ApiProperty({ enum: Difficulty, description: 'Сложность' })
  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @ApiPropertyOptional({ description: 'Количество вопросов (1-20)', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;

  @ApiPropertyOptional({ description: 'Подкатегория', example: 'Эффект якоря' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Тема', example: 'Ценообразование и переговоры' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Сохранить в БД сразу', default: true })
  @IsOptional()
  saveToDB?: boolean;
}
