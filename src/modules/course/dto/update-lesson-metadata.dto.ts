import { IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateLessonMetadataDto {
  @IsArray()
  @IsString({ each: true })
  mainTopics: string[];

  @IsOptional()
  otherMetadata?: Record<string, any>;
}
