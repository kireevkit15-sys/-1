import { IsUUID, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExplainDto {
  @ApiProperty({ description: 'Concept ID to explain' })
  @IsUUID()
  conceptId!: string;

  @ApiProperty({ description: 'User explanation in their own words', minLength: 10 })
  @IsString()
  @MinLength(10)
  explanation!: string;
}
