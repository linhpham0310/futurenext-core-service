import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateLessonMetadataDto {
  // TASK S4-CM-05: Cấu trúc Metadata chứa danh sách Key Concepts
  @IsArray()
  @IsString({ each: true })
  keyConcepts: string[];

  @IsOptional()
  otherMetadata?: Record<string, any>;
}
