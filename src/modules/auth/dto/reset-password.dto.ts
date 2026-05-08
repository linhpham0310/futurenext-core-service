// src/modules/auth/dto/reset-password.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for password reset requests using OTP.
 * Defines the shape and validation rules for the payload (email, OTP, new password).
 */
export class ResetPasswordDto {
  /**
   * The email address associated with the password reset request. Normalized.
   * @example "user@example.com"
   */
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  /**
   * The One-Time Password (OTP) received via email. Expected to be 6 digits.
   * @example "123456"
   */
  @IsNotEmpty({ message: 'Mã OTP không được để trống.' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số.' })
  otp: string;

  /**
   * The new password the user wants to set. Must meet complexity requirements.
   * @example "newStrongPassword1"
   */
  @IsString()
  @IsNotEmpty()
  @Length(8, 50, { message: 'Mật khẩu phải từ 8-50 ký tự.' })
  // Regex: Tối thiểu 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt
  @Matches(/((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường và số/ký tự đặc biệt.',
  })
  newPassword: string;

  //  THÊM MỚI: Xác nhận mật khẩu mới
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới.' })
  confirmNewPassword: string;
}
