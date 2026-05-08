// src/modules/users/dto/update-profile.dto.ts
// import { IsString, IsOptional, IsUrl, IsDateString, MaxLength } from 'class-validator';

/**
 * Data Transfer Object for updating the current user's profile information.
 * Defines the editable fields and includes the 'updatedAt' timestamp for optimistic locking.
 * Properties and validation decorators will be added in Sprint 1 based on UC06.2/UC06.4.
 */
export class UpdateProfileDto {
  /**
   * The user's updated full name. Optional.
   * @example "Nguyen Van B"
   */
  // @IsOptional() // Allow partial updates
  // @IsNotEmpty({ message: 'Họ tên không được để trống.' }) // Ensure not empty if provided
  // @IsString()
  // @MaxLength(100)
  // fullName?: string;
  /**
   * The user's updated avatar URL. Optional. Must be a valid URL.
   * @example "https://example.com/new-avatar.jpg"
   */
  // @IsOptional()
  // @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ.' })
  // @MaxLength(255) // Limit URL length
  // avatarUrl?: string | null; // Allow setting to null
  /**
   * The timestamp (ISO 8601 string) of the user record when the client last fetched it.
   * Required for Optimistic Locking mechanism .
   * @example "2025-10-26T10:30:00.000Z"
   */
  // @IsDateString({}, { message: 'updatedAt phải là định dạng ngày giờ ISO 8601 hợp lệ.' })
  // @IsNotEmpty({ message: 'updatedAt là bắt buộc để tránh ghi đè dữ liệu.'})
  // updatedAt: string;
}
