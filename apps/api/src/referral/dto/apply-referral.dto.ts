import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ApplyReferralDto {
  @ApiProperty({
    description: 'Реферальный код пригласившего пользователя',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  code!: string;
}
