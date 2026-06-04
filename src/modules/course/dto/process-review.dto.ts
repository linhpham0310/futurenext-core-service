import { CourseStatus } from '@prisma/client';
import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';

export class ProcessReviewDto {
  // TASK S4-CM-03: Chỉ cho phép Admin chọn APPROVED hoặc REJECTED
  @IsEnum([CourseStatus.PUBLISHED, CourseStatus.REJECTED], {
    message: 'Hành động phải là PUBLISHED (Duyệt) hoặc REJECTED (Từ chối)',
  })
  action: CourseStatus;

  // Nếu Reject thì bắt buộc phải có lý do
  @ValidateIf((o) => o.action === CourseStatus.REJECTED)
  @IsString()
  @IsOptional()
  reason?: string;
}
