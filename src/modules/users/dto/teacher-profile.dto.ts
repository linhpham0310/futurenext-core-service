// [Task: S3-BE-01] Khởi tạo DTO cho luồng đăng ký hồ sơ giáo viên
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types'; // Hoặc '@nestjs/swagger' nếu dự án dùng Swagger

export class SubmitTeacherProfileDto {
  @IsString({ message: 'Bio phải là chuỗi văn bản' })
  @IsNotEmpty({ message: 'Bio không được để trống' })
  @MaxLength(2000, { message: 'Bio không được vượt quá 2000 ký tự' })
  bio: string;

  // [Task: S3-BE-01] Expertise là mảng các chuyên môn (VD: ["TypeScript", "Data Structures"])
  @IsArray({ message: 'Expertise phải là một mảng' })
  @IsOptional()
  @IsString({ each: true, message: 'Mỗi chuyên môn phải là chuỗi văn bản' })
  expertise?: string[];
}

// [Task: S3-BE-01] DTO cho Update kế thừa từ Submit nhưng cho phép các trường là optional
export class UpdateTeacherProfileDto extends PartialType(
  SubmitTeacherProfileDto,
) {}
