import {
  IsString,
  IsInt,
  IsArray,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Branch, Difficulty } from '@prisma/client';

export class CreateQuestionDto {
  @IsString()
  text!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options!: string[];

  @IsInt()
  correctIndex!: number;

  @IsString()
  category!: string;

  @IsEnum(Branch)
  branch!: Branch;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsString()
  statPrimary!: string;

  @IsOptional()
  @IsString()
  statSecondary?: string;

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
  @IsInt()
  correctIndex?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Branch)
  branch?: Branch;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  statPrimary?: string;

  @IsOptional()
  @IsString()
  statSecondary?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}
