// src/modules/auth/dto/verify-email.dto.ts
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' }) // Ensure email is provided
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @IsNotEmpty({ message: 'Mã OTP không được để trống.' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự.' })
  @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số.' }) // OTP must be exactly 6 digits
  otp: string;
}
