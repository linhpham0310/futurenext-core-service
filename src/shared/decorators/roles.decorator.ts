/**
 * @file Custom decorator to attach role metadata to route handlers for authorization.
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/modules/users/entities/user.entity';

export const ROLES_KEY = 'roles'; // Key to store metadata

/**
 * @Roles decorator.
 * Attaches required roles to a route handler's metadata.
 * Used in conjunction with RolesGuard.
 * @param roles - An array of UserRole enums required to access the route.
 * @example @Roles(UserRole.ADMIN)
 * @example @Roles(UserRole.ADMIN, UserRole.TEACHER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
