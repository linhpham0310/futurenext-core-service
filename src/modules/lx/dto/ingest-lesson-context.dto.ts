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
// --- TASK: LX-AI-1.2 (SPRINT 1) ---
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
