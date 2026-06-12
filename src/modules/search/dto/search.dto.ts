// src/modules/search/dto/search.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class SearchDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}
