// src/modules/users/dto/update-user-role.dto.ts
// import { IsEnum, IsNotEmpty } from 'class-validator';
// import { UserRole } from '../entities/user.entity'; // Import enum Role

/**
 * Data Transfer Object for updating a user's role (Admin action).
 * Defines the new role to be assigned.
 * Properties and validation decorators will be added later based on UC05.3/UC04.4.
 */
export class UpdateUserRoleDto {
  /**
   * The new role to assign to the user.
   * Must be one of the defined UserRole enum values.
   * @example UserRole.TEACHER
   */
  // @IsNotEmpty({ message: 'Vai trò mới không được để trống.'})
  // @IsEnum(UserRole, { message: 'Vai trò không hợp lệ.' })
  // newRole: UserRole;
}
