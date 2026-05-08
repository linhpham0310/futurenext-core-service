// src/modules/users/dto/find-users-query.dto.ts
// import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
// import { Type } from 'class-transformer'; // Needed for type conversion from query string
// import { UserRole, UserStatus } from '../entities/user.entity'; // Import enums

/**
 * Data Transfer Object for querying the list of users (typically for Admin).
 * Defines optional query parameters for pagination, filtering, and searching.
 * Properties and validation decorators (@IsOptional, @IsInt, @Min, @Max, @IsEnum, @Type)
 * will be added later based on UC05.3 requirements.
 */
export class FindUsersQueryDto {
  /**
   * Page number for pagination (starts from 1).
   * @example 1
   * @default 1
   */
  // @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  // page?: number = 1;
  /**
   * Number of items per page.
   * @example 20
   * @default 20
   */
  // @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) // Limit max page size
  // pageSize?: number = 20;
  /**
   * Filter users by role.
   * @example UserRole.TEACHER
   */
  // @IsOptional() @IsEnum(UserRole)
  // role?: UserRole;
  /**
   * Filter users by status.
   * @example UserStatus.ACTIVE
   */
  // @IsOptional() @IsEnum(UserStatus)
  // status?: UserStatus;
  /**
   * Search term to filter users by full name or email (case-insensitive).
   * @example "John Doe"
   */
  // @IsOptional() @IsString()
  // search?: string;
}
