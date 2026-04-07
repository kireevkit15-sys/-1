import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ description: 'Тип события', example: 'session_start' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({
    description: 'Дополнительные данные события',
    example: { screen: 'home', duration: 120 },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
