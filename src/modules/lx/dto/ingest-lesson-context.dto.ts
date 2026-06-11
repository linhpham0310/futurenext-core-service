import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChunkItemDto {
  @IsInt()
  @IsNotEmpty()
  chunkIndex: number;

  @IsString()
  @IsNotEmpty()
  contentChunk: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
export class IngestLessonContextDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChunkItemDto)
  chunks: ChunkItemDto[];
}
