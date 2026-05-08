// src/modules/auth/dto/register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  MaxLength,
  IsBoolean,
  Equals,
  IsIn,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer'; // Import Transform for normalization

/**
 * Data Transfer Object for user registration requests.
 * Defines the shape and validation rules for the registration payload.
 */
export class RegisterDto {
  /**
   * The user's full name. Cannot be empty.
   * @example "Nguyen Van A"
   */
  @IsNotEmpty({ message: 'Họ tên không được để trống.' }) // BR: Required field [cite: 1992]
  @IsString({ message: 'Họ tên phải là chuỗi.' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự.' }) // Added reasonable max length
  fullName: string;

  /**
   * The user's email address. Must be a valid email format and unique in the system.
   * It will be normalized to lowercase and trimmed before validation.
   * @example "user@example.com"
   */
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' }) // BR: Valid email format [cite: 1995]
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  ) // BR: Normalize email
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' }) // Standard email length limit
  email: string;

  /**
   * The desired password for the new account.
   * Must meet complexity requirements (min 8 chars, at least one letter and one number).
   * @example "password123"
   */
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }) // BR: Password Policy - Min Length [cite: 1998]
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Limit length for safety
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    // BR: Password Policy - Complexity [cite: 1999-2001]
    message: 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.',
  })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Added reasonable max length
  password: string;

  @IsOptional()
  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự.' })
  @ValidateIf((o) => o.confirmPassword !== undefined)
  confirmPassword?: string;

  //  THÊM MỚI: Role (học viên hoặc giảng viên)
  @IsString({ message: 'Vai trò không hợp lệ.' })
  @IsIn(['student', 'teacher'], {
    message: 'Vai trò phải là học viên hoặc giảng viên.',
  })
  role: 'student' | 'teacher';

  /**
   * Confirmation that the user accepts the terms of service. Must be true.
   * @example true
   */
  @IsBoolean() // BR: Consent bắt buộc [cite: 1988-1989]
  @IsNotEmpty({
    message: 'Bạn phải đồng ý với điều khoản dịch vụ để tiếp tục.',
  })
  agreeTerms: boolean;
}
