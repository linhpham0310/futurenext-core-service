// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi.' })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Giới hạn độ dài để tránh tấn công DoS
  password: string;
}
