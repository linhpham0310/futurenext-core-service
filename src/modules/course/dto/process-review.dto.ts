import { CourseStatus } from '@prisma/client';
import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';

export class ProcessReviewDto {
  @IsEnum([CourseStatus.PUBLISHED, CourseStatus.REJECTED], {
    message: 'Hành động phải là PUBLISHED (Duyệt) hoặc REJECTED (Từ chối)',
  })
  action: CourseStatus;

  @ValidateIf((o) => o.action === CourseStatus.REJECTED)
  @IsString()
  @IsOptional()
  reason?: string;
}
