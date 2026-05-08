// src/shared/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core'; // Import Reflector để đọc metadata
import { UserRole } from '@/modules/users/entities/user.entity'; // Import enum Role từ User entity

// Khai báo một key để lưu và truy xuất metadata về roles (có thể đặt trong file riêng constants.ts)
export const ROLES_KEY = 'roles';

/**
 * A guard that checks if the authenticated user has one of the required roles
 * specified by the @Roles() decorator on the route handler or controller.
 * Should be used AFTER an authentication guard (e.g., JwtAuthGuard) has run
 * and attached the user object (with a 'role' property) to the request.
 * Throws ForbiddenException if the user role is not allowed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  // Implement CanActivate interface
  constructor(private reflector: Reflector) {} // Inject Reflector để đọc metadata

  canActivate(context: ExecutionContext): boolean {
    // 1. Lấy danh sách roles yêu cầu từ metadata (được set bởi @Roles() decorator)
    // reflector.getAllAndOverride đọc metadata từ cả handler (method) và class (controller), ưu tiên handler
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [
        context.getHandler(), // Lấy metadata từ method handler
        context.getClass(), // Lấy metadata từ class controller
      ],
    );

    // 2. Nếu không có metadata @Roles() => route không yêu cầu role cụ thể => cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Lấy thông tin user đã được xác thực từ request (do JwtAuthGuard gắn vào)
    const { user } = context.switchToHttp().getRequest();

    // 4. Kiểm tra xem user có tồn tại và có thuộc tính 'role' không
    if (!user || !user.role) {
      // Nếu không có user hoặc role (JwtAuthGuard chưa chạy hoặc validate thất bại), từ chối truy cập
      // Log cảnh báo ở đây có thể hữu ích để debug
      // console.warn('RolesGuard activated but no user or user.role found on request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tài nguyên này (thiếu thông tin vai trò).',
      );
    }

    // 5. So sánh vai trò của user với danh sách roles yêu cầu
    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Bạn không có quyền truy cập. Yêu cầu vai trò: ${requiredRoles.join(', ')}.`,
      );
    }

    // 6. Nếu có vai trò phù hợp => cho phép truy cập
    return true;
  }
}
