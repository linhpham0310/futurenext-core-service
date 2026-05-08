// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt'; // Import các thành phần cần thiết từ passport-jwt
import { ConfigService } from '@nestjs/config'; // Import ConfigService để đọc secret key
// Import UsersService hoặc UserRepository nếu cần kiểm tra user trong validate() ở Sprint 1
// import { UsersService } from '@/modules/users/services/users.service';

/**
 * Chiến lược PassportJS để xác thực JWT Access Token.
 * Nó tự động trích xuất token từ header, xác minh chữ ký/hết hạn bằng JWT_SECRET,
 * và gọi hàm validate() để kiểm tra payload và trả về thông tin user.
 */
@Injectable() // Đánh dấu là một Provider có thể được inject
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // Kế thừa từ PassportStrategy, dùng loại 'Strategy' từ passport-jwt, đặt tên là 'jwt' (mặc định)
  constructor(
    private readonly configService: ConfigService, // Inject ConfigService
    // private readonly usersService: UsersService, // Sẽ inject ở Sprint 1 để kiểm tra user
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not set');
    super({
      // --- Cấu hình cách trích xuất và xác thực token ---
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), //  Chỉ định lấy token từ 'Authorization: Bearer <token>' header
      secretOrKey: secret, //  Đọc secret key dùng để ký Access Token từ biến môi trường

      ignoreExpiration: false, //  Quan trọng: KHÔNG bỏ qua kiểm tra hết hạn token
    });
  }

  /**
   * Hàm này được PassportJS tự động gọi *sau khi* token đã được xác minh chữ ký và chưa hết hạn.
   * @param payload Nội dung đã được giải mã từ JWT (thường chứa userId (sub), email, role...).
   * @returns Thông tin user sẽ được gắn vào request.user (ví dụ: { userId, email, role }).
   * Ném UnauthorizedException nếu payload không hợp lệ hoặc user không hợp lệ.
   */
  async validate(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<any> {
    // Log payload ở dev để debug (xóa hoặc giảm log ở production)
    // console.log('JWT Payload:', payload);

    // 1. Kiểm tra payload cơ bản
    if (!payload || !payload.sub) {
      // 'sub' thường chứa userId
      throw new UnauthorizedException('Token payload không hợp lệ.');
    }

    // 2. --- Logic kiểm tra User (Sẽ thêm ở Sprint 1) ---
    // Ví dụ:
    // const user = await this.usersService.findActiveById(payload.sub); // Tìm user trong DB bằng ID từ token
    // if (!user) {
    //   throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
    // }
    // // Kiểm tra xem role trong token có khớp với role hiện tại trong DB không (tùy chọn)
    // if (user.role !== payload.role) {
    //    throw new UnauthorizedException('Vai trò người dùng đã thay đổi.');
    // }

    // 3. Trả về thông tin user cần thiết để gắn vào req.user
    // Chỉ trả về các thông tin an toàn, không nhạy cảm.
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
