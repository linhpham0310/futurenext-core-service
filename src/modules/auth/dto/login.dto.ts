// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for user login requests.
 * Defines the shape and validation rules for the login payload (email and password).
 */
export class LoginDto {
  /**
   * The user's email address. Normalized to lowercase and trimmed.
   * @example "user@example.com"
   */
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' })
  email: string;

  /**
   * The user's password.
   * @example "password123"
   */
  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi.' })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Giới hạn độ dài để tránh tấn công DoS
  password: string;
}
