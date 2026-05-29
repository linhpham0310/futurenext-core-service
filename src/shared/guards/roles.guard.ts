/**
 * @file Guard for Role-Based Access Control (RBAC).
 * Checks if the current user's role matches the roles required by the route.
 * Must be used AFTER an authentication guard like JwtAuthGuard.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';
import { JwtAccessPayload } from '@/modules/auth/strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    // Reflector is used to retrieve metadata (like roles) from route handlers
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from the metadata attached by the @Roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [
        context.getHandler(), // Look for metadata on the method
        context.getClass(), // Look for metadata on the class
      ],
    );

    // 2. If no roles are required, allow access by default
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Get the user object from the request (attached by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload;

    // 4. If there's no user object or role, deny access
    if (!user || !user.role) {
      throw new ForbiddenException('Không có quyền truy cập.');
    }

    // 5. Check if the user's role is included in the list of required roles
    const hasPermission = requiredRoles.some((role) => user.role === role);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Yêu cầu vai trò: ${requiredRoles.join(', ')}.`,
      );
    }

    return true; // User has the required role, allow access
  }
}
