import { CourseStatus } from '@prisma/client';
import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';

export class ProcessReviewDto {
  @IsEnum([CourseStatus.APPROVED, CourseStatus.REJECTED], {
    message: 'Hành động phải là APPROVED (Duyệt) hoặc REJECTED (Từ chối)',
  })
  action: CourseStatus;

  @ValidateIf((o) => o.action === CourseStatus.REJECTED)
  @IsString()
  @IsOptional()
  reason?: string;
}
