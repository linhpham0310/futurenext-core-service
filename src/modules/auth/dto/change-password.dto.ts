import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  newPassword: string;
}
