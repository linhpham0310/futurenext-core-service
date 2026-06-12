import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  IsISO8601,
  IsNotEmpty,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ tên không được để trống (nếu cập nhật).' }) // Không cho phép gửi chuỗi rỗng
  @MaxLength(100, { message: 'Họ tên không được vượt quá 100 ký tự.' })
  fullName?: string;

  /**
   * User's updated avatar URL. Optional. Must be a valid URL format.
   * @example "https://example.com/new-avatar.jpg"
   */
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ.' })
  @MaxLength(1024, {
    message: 'URL ảnh đại diện không được vượt quá 1024 ký tự.',
  })
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
