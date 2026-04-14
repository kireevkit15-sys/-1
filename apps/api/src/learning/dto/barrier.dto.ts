import { IsArray, IsString, MinLength, ValidateNested, ArrayMinSize, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── B22.2: Recall stage ──────────────────────────

export class RecallAnswer {
  @ApiProperty({ description: 'Concept ID being recalled' })
  @IsUUID()
  conceptId!: string;

  @ApiProperty({ description: 'User recall answer', minLength: 5 })
  @IsString()
  @MinLength(5)
  answer!: string;
}

export class BarrierRecallDto {
  @ApiProperty({ type: [RecallAnswer], description: '6 recall answers' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecallAnswer)
  answers!: RecallAnswer[];
}

// ── B22.3: Connect stage ─────────────────────────

export class ConnectPair {
  @ApiProperty({ description: 'First concept ID' })
  @IsUUID()
  conceptA!: string;

  @ApiProperty({ description: 'Second concept ID' })
  @IsUUID()
  conceptB!: string;

  @ApiProperty({ description: 'User explanation of connection', minLength: 10 })
  @IsString()
  @MinLength(10)
  explanation!: string;
}

export class BarrierConnectDto {
  @ApiProperty({ type: [ConnectPair], description: '3 connection pairs' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConnectPair)
  pairs!: ConnectPair[];
}

// ── B22.4: Apply stage ───────────────────────────

export class ApplyAnswer {
  @ApiProperty({ description: 'Situation index (0-based)' })
  situationIndex!: number;

  @ApiProperty({ description: 'User answer applying concepts', minLength: 20 })
  @IsString()
  @MinLength(20)
  answer!: string;
}

export class BarrierApplyDto {
  @ApiProperty({ type: [ApplyAnswer], description: '2 situation answers' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApplyAnswer)
  answers!: ApplyAnswer[];
}

// ── B22.5: Defend stage ──────────────────────────

export class BarrierDefendDto {
  @ApiProperty({ description: 'Barrier ID' })
  @IsUUID()
  barrierId!: string;

  @ApiProperty({ description: 'User defense message', minLength: 10 })
  @IsString()
  @MinLength(10)
  message!: string;

  @ApiPropertyOptional({ description: 'Round number (1-4)' })
  @IsOptional()
  round?: number;
}
