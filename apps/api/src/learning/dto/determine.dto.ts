import { IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeterminationAnswer {
  @ApiProperty({ description: 'Situation number (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  situationIndex!: number;

  @ApiProperty({ description: 'Chosen option index (0-3)', minimum: 0, maximum: 3 })
  @IsInt()
  @Min(0)
  @Max(3)
  chosenOption!: number;
}

export class DetermineDto {
  @ApiProperty({ type: [DeterminationAnswer], description: '5 answers for initial determination' })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => DeterminationAnswer)
  answers!: DeterminationAnswer[];
}
