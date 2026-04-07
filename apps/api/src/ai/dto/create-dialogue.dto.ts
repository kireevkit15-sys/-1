import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDialogueDto {
  @ApiPropertyOptional({ description: 'UUID of the related learning module' })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiProperty({ description: 'Topic of the dialogue', example: 'Теория игр' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  topic!: string;

  @ApiProperty({ description: 'First user message', example: 'Что такое дилемма заключённого?' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}
