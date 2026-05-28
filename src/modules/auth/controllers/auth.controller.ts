// src/modules/auth/controllers/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
// Import ThrottlerGuard nếu áp dụng ở đây thay vì toàn cục, hoặc chỉ dùng @Throttle
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { Request } from 'express'; // Import Request type để lấy headers
import { VerifyEmailDto } from '../dto/verify-email.dto';

@Controller('auth') // Base path cho các route trong controller này là /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles user registration requests.
   * Applies rate limiting per IP address.
   * Validates request body using RegisterDto.
   * @param registerDto - Validated registration data from request body.
   * @param ip - IP address extracted from the request.
   * @param req - Express Request object to access headers.
   * @returns Success message or throws appropriate HTTP exception.
   */
  // Áp dụng Rate Limit: 5 lần gọi từ mỗi IP trong 1 giờ (BR: Rate-limit) [cite: 2002-2003, 2013]
  // Sử dụng key 'default' nếu cấu hình mặc định trong ThrottlerModule là đủ,
  // hoặc đặt tên key riêng nếu cần cấu hình khác: @Throttle('register', { limit: 5, ttl: 3600000 })
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('register') // Map với HTTP POST /auth/register
  @HttpCode(HttpStatus.CREATED) // Set HTTP status code thành công là 201 Created
  async register(
    // @Body() tự động lấy request body và ValidationPipe (global) sẽ validate dựa trên RegisterDto
    @Body() registerDto: RegisterDto,
    @Body('confirmPassword') confirmPassword: string, // THÊM DÒNG NÀY

    // @Ip() decorator của NestJS để lấy IP address của client một cách đáng tin cậy
    @Ip() ip: string,
    // @Req() decorator để inject đối tượng Request gốc của Express
    @Req() req: Request,
  ): Promise<{ message: string }> {
    // Lấy User-Agent từ request headers
    const userAgent = req.headers['user-agent'];
    // Validate confirmPassword ở đây
    if (confirmPassword && registerDto.password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp.');
    }
    // Gọi phương thức register của AuthService, truyền DTO và thông tin request
    return this.authService.register(registerDto, ip, userAgent);
  }

  /**
   * Handles email verification requests using OTP.
   * Applies rate limiting per IP address.
   * @param verifyEmailDto - Validated email and OTP from request body.
   * @returns Success message or throws appropriate HTTP exception.
   */
  // Áp dụng Rate Limit: 10 lần gọi từ mỗi IP trong 1 giờ (BR: Rate-limit endpoint) [cite: 2506, 2517]
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('verify-email') // Map với HTTP POST /auth/verify-email [cite: 2434]
  @HttpCode(HttpStatus.OK) // Set HTTP status code thành công là 200 OK [cite: 2447]
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto, // Validate body bằng DTO và ValidationPipe
  ): Promise<{ message: string }> {
    // Gọi phương thức verifyEmail của AuthService
    return this.authService.verifyEmail(verifyEmailDto);
  }
}
