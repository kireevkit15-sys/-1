import { IsString, IsNumber, IsOptional } from 'class-validator';

export class TelegramLoginDto {
  @IsNumber()
  id!: number;

  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsNumber()
  auth_date!: number;

  @IsString()
  hash!: string;
}
