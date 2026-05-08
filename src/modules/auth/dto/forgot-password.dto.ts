// src/modules/auth/dto/forgot-password.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer'; // Import Transform for normalization

/**
 * Data Transfer Object for forgot password requests.
 * Defines the shape and validation rules for the payload, requiring the user's email.
 */
export class ForgotPasswordDto {
  /**
   * The email address associated with the account to reset the password for.
   * It will be normalized to lowercase and trimmed.
   * @example "user@example.com"
   */
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  ) // Normalize email
  email: string;
}
