/**
 * @file Data Transfer Object for updating user profile information.
 * Includes fields allowed for update and the necessary 'updatedAt' for optimistic locking.
 */
import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  IsISO8601,
  IsNotEmpty,
} from 'class-validator';

export class UpdateProfileDto {
  /**
   * User's updated full name. Optional.
   * @example "Nguyen Van B"
   */
  @IsOptional() // Cho phép không gửi lên nếu không muốn đổi
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
  avatarUrl?: string | null; // Cho phép gửi null để xóa avatar

  /**
   * The 'updatedAt' timestamp of the user record when the client last fetched it.
   * REQUIRED for Optimistic Locking (UC06.4). Must be a valid ISO 8601 date string.
   * Client MUST send this value, obtained from the initial GET /me/profile request.
   * @example "2025-10-26T10:30:15.123Z"
   */
  @IsNotEmpty({ message: 'Timestamp updatedAt là bắt buộc để cập nhật.' })
  @IsISO8601(
    {},
    { message: 'Timestamp updatedAt phải là định dạng ISO 8601 hợp lệ.' },
  ) // Validate date string format
  updatedAt: string; // Nhận dạng string từ client
}
