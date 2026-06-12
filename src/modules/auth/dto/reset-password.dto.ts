// src/modules/auth/dto/reset-password.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @IsNotEmpty({ message: 'Mã OTP không được để trống.' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số.' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 50, { message: 'Mật khẩu phải từ 8-50 ký tự.' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường và số/ký tự đặc biệt.',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới.' })
  confirmNewPassword: string;
}
