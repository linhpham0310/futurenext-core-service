import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class UpdateLessonFullDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isAiEnabled?: boolean;

  @IsOptional()
  @IsObject()
  aiContext?: { customInstructions?: string; faqs?: string[] };

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  mainTopics?: string[];

  @IsOptional()
  @IsUUID()
  examId?: string;
}
