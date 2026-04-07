import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitProgressDto {
  @ApiProperty({ description: 'UUID of the completed question' })
  @IsUUID()
  questionId!: string;
}
