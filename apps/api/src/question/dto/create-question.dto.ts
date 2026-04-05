import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options!: string[];

  @IsString()
  correctAnswer!: string;

  @IsString()
  category!: string;

  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty!: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class BulkCreateQuestionsDto {
  @IsArray()
  questions!: CreateQuestionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsString()
  explanation?: string;
}
