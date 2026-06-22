// src/modules/auth/auth.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModuleOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { EventEmitterModule } from '@nestjs/event-emitter'; // Import EventEmitterModule nếu chưa global
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
// Import các Entities mà AuthService hoặc các thành phần khác trong module này cần
import { EmailVerification } from './entities/email-verification.entity';
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity'; // Import luôn nếu dùng chung module
import { User } from '../users/entities/user.entity'; // Cần cho AuthService nếu dùng EntityManager
import { UserCredential } from '../users/entities/user-credential.entity'; // Cần cho AuthService
import { UserConsent } from '../users/entities/user-consent.entity'; // Cần cho AuthService
// Import Strategies và Guards (sẽ tạo ở task sau)
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'; // <<<--- IMPORT
import { UsersModule } from '../users/users.module';
import { EmailService } from '../notifications/services/email.service'; // đúng path của bạn
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthListener } from './listeners/auth.listener';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { SharedModule } from '@/shared/shared.module';
import { GoogleStrategy } from './strategies/google.strategy';
@Module({
  imports: [
    ConfigModule, // Cần ConfigService
    // Đăng ký các Entities với TypeORM trong scope của module này
    TypeOrmModule.forFeature([
      User, // Cần thiết nếu AuthService dùng EntityManager hoặc UserRepository
      UserCredential,
      UserConsent,
      EmailVerification,
      AuthSession,
      PasswordResetRequest, // Đăng ký luôn nếu thuộc module này
    ]),
    forwardRef(() => UsersModule),
    NotificationsModule,
    SharedModule,
    PassportModule.register({ defaultStrategy: 'jwt' }), // Cấu hình Passport
    // Cấu hình JwtModule động để đọc secret/expiresIn từ ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule], // Import ConfigModule vào đây
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        // Đọc string từ env
        const expiresInString =
          configService.get<string>('JWT_EXPIRES_IN') || '900';

        // Chuyển sang number (giây)
        const expiresIn = Number(expiresInString);

        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: isNaN(expiresIn) ? undefined : expiresIn, // Nếu không phải số thì bỏ qua
          },
        };
      },
    }),

    EventEmitterModule.forRoot(),
    // Import EventEmitterModule nếu nó chưa được set global trong AppModule
    // EventEmitterModule,
  ],
  controllers: [AuthController], // Khai báo Controller
  providers: [
    AuthService,
    AuthListener,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    JwtRefreshGuard,
  ],
  // Export AuthService nếu module khác cần inject trực tiếp (thường không cần)
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
