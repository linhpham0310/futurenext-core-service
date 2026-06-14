// src/modules/auth/dto/register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  MaxLength,
  IsBoolean,
  IsIn,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer'; // Import Transform for normalization

export class RegisterDto {
  @IsNotEmpty({ message: 'Họ tên không được để trống.' }) // BR: Required field [cite: 1992]
  @IsString({ message: 'Họ tên phải là chuỗi.' })
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự.' }) // Added reasonable max length
  fullName: string;

  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' }) // BR: Valid email format [cite: 1995]
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự.' }) // Standard email length limit
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' }) // BR: Password Policy - Min Length [cite: 1998]
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Limit length for safety
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    },
  )
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' }) // Added reasonable max length
  password: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.confirmPassword !== undefined)
  confirmPassword?: string;

  @IsString({ message: 'Vai trò không hợp lệ.' })
  @IsIn(['student', 'teacher'], {
    message: 'Vai trò phải là học viên hoặc giảng viên.',
  })
  role: 'student' | 'teacher';

  @IsBoolean()
  @IsNotEmpty({
    message: 'Bạn phải đồng ý với điều khoản dịch vụ để tiếp tục.',
  })
  agreeTerms: boolean;
}
