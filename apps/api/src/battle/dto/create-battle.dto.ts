import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateBattleDto {
  @IsEnum(['bot', 'pvp'])
  mode!: 'bot' | 'pvp';

  @IsOptional()
  @IsString()
  category?: string;
}
