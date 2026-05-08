// src/modules/auth/dto/verify-email.dto.ts
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for email verification requests using OTP.
 * Defines the shape and validation rules for the payload (email and OTP).
 */
export class VerifyEmailDto {
  /**
   * The email address to be verified. Normalized.
   * @example "user@example.com"
   */
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' }) // Ensure email is provided
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  /**
   * The One-Time Password (OTP) received via email. Expected to be 6 digits.
   * @example "123456"
   */
  @IsNotEmpty({ message: 'Mã OTP không được để trống.' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự.' })
  @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số.' }) // OTP must be exactly 6 digits
  otp: string;
}
