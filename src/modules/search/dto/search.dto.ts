// src/modules/search/dto/search.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}
