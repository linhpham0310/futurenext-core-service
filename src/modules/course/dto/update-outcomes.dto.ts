// src/modules/course/dto/update-outcomes.dto.ts
import { IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OutcomeItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOutcomesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutcomeItemDto)
  outcomes: OutcomeItemDto[];
}
