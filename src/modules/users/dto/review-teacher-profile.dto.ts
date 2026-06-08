import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';

export class ReviewTeacherProfileDto {
  @IsEnum(TeacherProfileStatus)
  status: TeacherProfileStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
