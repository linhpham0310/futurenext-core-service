import {
  Controller,
  Post,
  Body,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  Res,
  Logger,
  UseGuards,
  Patch,
  Request,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { ApiOperation } from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { AuthGuard } from '@nestjs/passport';

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
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const userAgent = req.headers['user-agent'];
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

  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // giới hạn 3 lần/giờ
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(
    @Body() dto: ResendOtpDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const userAgent = req.headers['user-agent'];
    return this.authService.resendVerificationOtp(dto.email, ip, userAgent);
  }
  @Throttle({ default: { limit: 20, ttl: 15 * 60 * 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    user: { id: string; fullName: string; role: string };
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

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const userId = req.user.userId;
    const oldRefreshToken = req.user.refreshToken;

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại.');
    }

    const { newAccessToken, newRefreshToken } =
      await this.authService.refreshTokens(userId, oldRefreshToken);

    const refreshTokenExpiresIn = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );
    const maxAgeMs = ms(refreshTokenExpiresIn as ms.StringValue);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') !== 'development',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: maxAgeMs,
    });

    return { accessToken: newAccessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.handleLogout(refreshToken, userId);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') !== 'development',
      sameSite: 'strict',
      path: '/auth/refresh',
    });
    return result;
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu mã đặt lại mật khẩu' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    await this.authService.handleForgotPassword(dto, ip);
    return {
      message:
        'Nếu địa chỉ email của bạn có trong hệ thống, chúng tôi đã gửi mã xác thực tới đó.',
    };
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng mã OTP' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    await this.authService.handleResetPassword(dto, ip);
    return {
      message:
        'Mật khẩu của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.userId, dto);
  }

  // Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken, user } = (req as any).user; // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // Redirect về frontend với access token (có thể dùng query param hoặc fragment)
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/social-callback?accessToken=${accessToken}`,
    );
  }
  @Get('test')
  testRoute() {
    return { message: 'AuthController works!' };
  }
}
