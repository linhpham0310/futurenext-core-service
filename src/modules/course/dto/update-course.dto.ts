// src/modules/course/dto/update-course.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
