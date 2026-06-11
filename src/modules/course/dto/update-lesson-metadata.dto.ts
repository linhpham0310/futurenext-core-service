import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateLessonMetadataDto {
  @IsArray()
  @IsString({ each: true })
  keyConcepts: string[];

  @IsOptional()
  otherMetadata?: Record<string, any>;
}
