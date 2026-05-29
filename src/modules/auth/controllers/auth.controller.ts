import {
  Controller,
  Post,
  Body,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  Logger,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { Request, Response } from 'express';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { LoginDto } from '../dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@/modules/users/entities/user.entity';
import ms from 'ms';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Body('confirmPassword') confirmPassword: string,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const userAgent = req.headers['user-agent'];
    if (confirmPassword && registerDto.password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp.');
    }
    return this.authService.register(registerDto, ip, userAgent);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Throttle({ default: { limit: 20, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    user: { id: string; fullName: string; role: UserRole };
  }> {
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(loginDto, ip, userAgent);

    const refreshTokenExpiresIn = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );
    const maxAgeMs = ms(refreshTokenExpiresIn as ms.StringValue);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') !== 'development',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: maxAgeMs,
    });

    this.logger.log(`Refresh token cookie set for user ${result.user.id}`);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @UseGuards(JwtRefreshGuard) // Apply the guard to protect this route [cite: 3040]
  @HttpCode(HttpStatus.OK)
  @Post('refresh') // Endpoint: POST /auth/refresh
  async refreshTokens(
    // Use the custom interface for type safety
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    // The JwtRefreshGuard already validated the token and attached the payload + raw token to req.user
    const userId = req.user.userId; // Get userId from the attached user object
    const oldRefreshToken = req.user.refreshToken; // Get the original token string
    this.logger.log(`Received token refresh request for user ID: ${userId}`);

    if (!oldRefreshToken) {
      this.logger.warn(`Refresh token missing for user ID: ${userId}`);
      throw new UnauthorizedException('Refresh token không tồn tại.');
    }
    // Call AuthService to perform rotation and get new tokens
    const { newAccessToken, newRefreshToken } =
      await this.authService.refreshTokens(userId, oldRefreshToken);

    // --- Set NEW Refresh Token in HttpOnly Cookie --- (Logic similar to login)
    const refreshTokenExpiresIn = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );
    const maxAgeMs: number = ms(refreshTokenExpiresIn as ms.StringValue);

    res.cookie(
      'refreshToken', // Cookie name must match extractor in strategy
      newRefreshToken, // The NEW refresh token value
      {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') !== 'development',
        sameSite: 'strict',
        path: '/auth/refresh', // Path must match extractor
        maxAge: maxAgeMs,
      },
    );
    this.logger.log(`New refresh token cookie set for user ${userId}`);

    // Return ONLY the new Access Token in the response body [cite: 3050]
    return { accessToken: newAccessToken };
  }

  /**
   * Handles user logout requests. Requires authentication (valid Access Token).
   * Revokes the session on the server and clears the refresh token cookie on the client.
   * @param req - Express Request object containing user info (from JwtAuthGuard) and cookies.
   * @param res - Express Response object for clearing the cookie.
   * @returns Success message.
   */
  @UseGuards(JwtAuthGuard) // <<<--- YÊU CẦU ĐĂNG NHẬP (Access Token hợp lệ)
  @Post('logout')
  @HttpCode(HttpStatus.OK) // Logout thành công trả về 200 OK
  async logout(
    @Req() req: RequestWithUser, // Dùng interface tùy chỉnh
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const userId = req.user.userId; // Lấy userId từ payload của Access Token
    const refreshToken = req.cookies.refreshToken; // Đọc refreshToken từ cookie [cite: 6899]
    this.logger.log(`Logout request received for user ID: ${userId}`);

    // Gọi AuthService để xử lý việc thu hồi session phía server
    const result = await this.authService.handleLogout(refreshToken, userId);

    // --- Xóa cookie refreshToken phía client ---
    // Dù server có revoke thành công hay không, client cần xóa cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') !== 'development',
      sameSite: 'strict',
      path: '/auth/refresh', // Path phải khớp với lúc set cookie
    });
    this.logger.log(`Refresh token cookie cleared for user ID: ${userId}`);

    // Trả về message từ AuthService
    return result;
  }

  // [SPRINT 2 - NEW] Endpoint Quên mật khẩu
  @Post('forgot-password')
  @UseGuards(ThrottlerGuard) // Chặn spam
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu mã đặt lại mật khẩu' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.authService.handleForgotPassword(dto, ip);
    // [SECURITY] Trả về message chung để tránh dò tìm email người dùng
    return {
      message:
        'Nếu địa chỉ email của bạn có trong hệ thống, chúng tôi đã gửi mã xác thực tới đó.',
    };
  }

  // [SPRINT 2 - NEW] Endpoint Đặt lại mật khẩu mới
  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng mã OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    await this.authService.handleResetPassword(dto, ip);
    return {
      message:
        'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại.',
    };
  }
}
