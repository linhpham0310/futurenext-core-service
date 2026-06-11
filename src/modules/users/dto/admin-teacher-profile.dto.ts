// [Task: S3-BE-02] Khởi tạo DTO quản lý payload từ Admin cho luồng duyệt giáo viên
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';

export class GetTeacherProfilesFilterDto {
  @IsOptional()
  @IsEnum(TeacherProfileStatus, { message: 'Trạng thái (status) không hợp lệ' })
  status?: TeacherProfileStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class ReviewTeacherProfileDto {
  @IsEnum(TeacherProfileStatus, {
    message: 'Trạng thái duyệt chỉ được phép là APPROVED hoặc REJECTED',
  })
  status: TeacherProfileStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
