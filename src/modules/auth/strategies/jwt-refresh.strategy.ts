// src/modules/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt'; // Import Strategy và ExtractJwt
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { Request } from 'express'; // Import Request object từ express để đọc cookie

/**
 * Chiến lược PassportJS để xác thực JWT Refresh Token.
 * Nó trích xuất token từ HttpOnly cookie 'refreshToken', xác minh chữ ký/hết hạn bằng REFRESH_TOKEN_SECRET,
 * và gọi hàm validate() để trả về payload và token gốc cho logic xử lý refresh.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  // Kế thừa và đặt tên strategy là 'jwt-refresh' (khác với 'jwt')
  constructor(private readonly configService: ConfigService) {
    const secret = configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not set');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refreshToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  /**
   * Hàm này được PassportJS gọi *sau khi* refresh token đã được xác minh chữ ký và chưa hết hạn.
   * @param request Đối tượng Request gốc (do passReqToCallback: true).
   * @param payload Nội dung đã được giải mã từ Refresh Token.
   * @returns Một object chứa cả payload và refresh token gốc. Thông tin này sẽ được gắn vào request.user khi dùng Guard 'jwt-refresh'.
   * Ném UnauthorizedException nếu payload không hợp lệ hoặc không tìm thấy token gốc.
   */
  async validate(
    request: Request,
    payload: { sub: string; email: string; role: string },
  ): Promise<any> {
    // 1. Kiểm tra payload cơ bản
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Refresh token payload không hợp lệ.');
    }

    // 2. Lấy lại refresh token gốc từ cookie (để trả về cho AuthService xử lý rotation/revocation)
    const refreshToken = request?.cookies?.refreshToken;
    if (!refreshToken) {
      // Trường hợp hiếm gặp nếu token bị xóa giữa lúc verify và validate
      throw new UnauthorizedException(
        'Không tìm thấy Refresh token trong request.',
      );
    }

    // --- Không cần kiểm tra user active ở đây ---
    // Logic kiểm tra session (token có bị revoke không) sẽ nằm trong AuthService.refreshTokens

    // 3. Trả về cả payload và token gốc
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role, // Giữ lại role từ payload
      refreshToken: refreshToken, // Trả về token gốc
    };
  }
}
