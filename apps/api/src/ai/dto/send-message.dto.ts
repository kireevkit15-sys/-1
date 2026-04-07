import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User message (max 500 chars)', example: 'А как это применить на практике?' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}
