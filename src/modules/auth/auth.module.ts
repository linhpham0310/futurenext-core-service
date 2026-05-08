import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { SharedModule } from 'src/shared/shared.module'; // Cần để inject HashingService, AuditService
import { UsersModule } from '../users/users.module'; // Cần để inject UsersRepository/UsersService
import { PassportModule } from '@nestjs/passport'; // Cần cho strategies
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'; // Cần để tạo và xác thực JWT
import { ConfigModule, ConfigService } from '@nestjs/config'; // Cần để đọc secrets/expiresIn
import { JwtStrategy } from './strategies/jwt.strategy'; // Strategy cho Access Token
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'; // Strategy cho Refresh Token
import { TypeOrmModule } from '@nestjs/typeorm'; // Cần để đăng ký entities của module này
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity';
import { EmailVerification } from './entities/email-verification.entity';

@Module({
  imports: [
    SharedModule, // Để inject HashingService, AuditService...
    UsersModule, // Để inject UsersRepository, UsersService...
    PassportModule.register({ defaultStrategy: 'jwt' }), // Đăng ký Passport với strategy mặc định là 'jwt'
    // --- Cấu hình JwtModule bất đồng bộ để đọc config từ .env ---
    JwtModule.registerAsync({
      imports: [ConfigModule], // Import ConfigModule
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not set');
        return {
          secret,
          signOptions: {
            expiresIn: '15m',
          },
        };
      },
    }),
    // Đăng ký các entities của module Auth
    TypeOrmModule.forFeature([
      AuthSession,
      EmailVerification,
      PasswordResetRequest,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // Phải khai báo strategy ở đây để PassportModule tìm thấy
    JwtRefreshStrategy, // Phải khai báo strategy ở đây
    // (Không cần khai báo Repository ở đây vì chúng thuộc UsersModule hoặc dùng TypeOrmModule.forFeature)
  ],
  exports: [AuthService, JwtModule, PassportModule], // Xuất các thành phần cần thiết cho module khác (nếu có)

})
export class AuthModule {}
