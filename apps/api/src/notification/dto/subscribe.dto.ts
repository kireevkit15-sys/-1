import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribePushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ description: 'P-256 Diffie-Hellman public key' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Authentication secret' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}
