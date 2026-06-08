// src/modules/course/dto/update-course.dto.ts
import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
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
}
