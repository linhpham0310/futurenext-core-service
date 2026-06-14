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
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    },
  )
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới.' })
  confirmNewPassword: string;
}
