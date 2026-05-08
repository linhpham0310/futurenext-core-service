// src/shared/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Import AuthGuard base class
import { Observable } from 'rxjs';

/**
 * A guard that utilizes the Passport 'jwt' strategy (JwtStrategy)
 * to protect routes requiring JWT Access Token authentication.
 * It automatically handles token extraction, verification, and user injection (req.user).
 * Throws UnauthorizedException if authentication fails.
 */
@Injectable()
// Kế thừa từ AuthGuard và chỉ định tên strategy là 'jwt' (tên mặc định hoặc tên đã đăng ký trong PassportModule)
export class JwtAuthGuard extends AuthGuard('jwt') {
  // (Optional) Bạn có thể override handleRequest để tùy chỉnh lỗi hoặc log
  // handleRequest(err, user, info, context: ExecutionContext) {
  //   if (err || !user) {
  //     // Log lỗi chi tiết hơn ở đây nếu cần
  //     // console.error('JWT Auth Error:', err || info?.message);
  //     throw err || new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  //   }
  //   return user; // Trả về user object nếu xác thực thành công
  // }
  // (Optional) Bạn có thể override canActivate để thêm logic kiểm tra trước khi gọi strategy
  // canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
  //   // Ví dụ: Kiểm tra xem route có đánh dấu là public không
  //   // const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
  //   // if (isPublic) {
  //   //   return true;
  //   // }
  //   return super.canActivate(context); // Gọi canActivate của AuthGuard('jwt')
  // }
}
