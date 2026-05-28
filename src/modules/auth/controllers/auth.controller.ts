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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { Request, Response } from 'express';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { LoginDto } from '../dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@/modules/users/entities/user.entity';
import ms from 'ms';

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
}
