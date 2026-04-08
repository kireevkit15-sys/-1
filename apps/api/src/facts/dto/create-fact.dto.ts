import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFactDto {
  @ApiProperty({ description: 'Текст факта', example: 'Шахматы были изобретены в Индии в VI веке.' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({ description: 'Источник', example: 'Wikipedia' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Ветка знаний', example: 'STRATEGY', enum: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] })
  @IsString()
  @IsIn(['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'])
  branch!: string;

  @ApiProperty({ description: 'Категория', example: 'Стратегическое мышление' })
  @IsString()
  @IsNotEmpty()
  category!: string;
}
