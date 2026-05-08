import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
// Import DTOs và Guards khi cần triển khai endpoints
// Ví dụ: import { RegisterDto } from '../dto/register.dto';

@Controller('auth') // Route prefix: /api/v1/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- Các Endpoints sẽ được triển khai ở Sprint 1-3 ---
  // Ví dụ cấu trúc endpoint đăng ký (sẽ hoàn thiện sau):
  // @Post('register')
  // @HttpCode(HttpStatus.CREATED)
  // async register(@Body() registerDto: RegisterDto, @Request() req) {
  //   const ip = req.ip;
  //   const userAgent = req.headers['user-agent'];
  //   return this.authService.register(registerDto, ip, userAgent);
  // }
}
