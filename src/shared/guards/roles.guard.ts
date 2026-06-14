import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@/modules/users/entities/user.entity';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload;

    if (!user || !user.role) {
      throw new ForbiddenException('Không có quyền truy cập.');
    }

    const hasPermission = requiredRoles.some((role) => user.role === role);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Yêu cầu vai trò: ${requiredRoles.join(', ')}.`,
      );
    }
    return true;
  }
}
