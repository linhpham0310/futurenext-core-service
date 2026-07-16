import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import ms from 'ms';

import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

import { HashingService } from '@/shared/providers/hashing/hashing.service';
import { AuditService } from '@/shared/providers/audit/audit.service';
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity';
import { UserCredential } from '@/modules/users/entities/user-credential.entity';
import { UserConsent } from '@/modules/users/entities/user-consent.entity';
import { EmailVerification } from '../entities/email-verification.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { PasswordResetRequest } from '../entities/password-reset-request.entity';
import { UsersService } from '@/modules/users/services/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetRequest)
    private readonly passwordResetRepo: Repository<PasswordResetRequest>,
    private readonly usersService: UsersService,
  ) {}

  private generateNumericOTP(length = 6): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return randomInt(min, max + 1)
      .toString()
      .padStart(length, '0');
  }

  async register(
    dto: RegisterDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp.');
    }
    const normalizedEmail = dto.email;
    const existingUser = await this.entityManager.findOne(User, {
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      this.auditService.log({
        action: 'user.register.failed_email_exists',
        ip,
        userAgent,
        meta: { email: normalizedEmail },
      });
      throw new ConflictException('Email đã tồn tại.');
    }

    const hashedPassword = await this.hashingService.hash(dto.password);
    const otp = this.generateNumericOTP(6);
    const otpHash = await this.hashingService.hash(otp);
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    let newUser: User;
    try {
      newUser = await this.entityManager.transaction(async (txManager) => {
        const user = txManager.create(User, {
          fullName: dto.fullName,
          email: normalizedEmail,
          role: dto.role === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT,
          status: UserStatus.PENDING_EMAIL_VERIFY,
          locale: 'vi-VN',
          timezone: 'Asia/Bangkok',
        });
        const savedUser = await txManager.save(user);
        await txManager.save(
          txManager.create(UserCredential, {
            userId: savedUser.id,
            passwordHash: hashedPassword,
            passwordUpdatedAt: new Date(),
          }),
        );
        const consentVersion = this.configService.get<string>(
          'CURRENT_CONSENT_VERSION',
          'unknown',
        );
        await txManager.save(
          txManager.create(UserConsent, {
            userId: savedUser.id,
            consentVersion,
            consentTimestamp: new Date(),
            ipAddress: ip,
            userAgent,
          }),
        );
        await txManager.save(
          txManager.create(EmailVerification, {
            userId: savedUser.id,
            email: normalizedEmail,
            codeHash: otpHash,
            expiresAt: otpExpiresAt,
          }),
        );
        return savedUser;
      });
    } catch (error) {
      this.logger.error(
        `Registration transaction failed for ${normalizedEmail}:`,
        error.stack,
      );
      this.auditService.log({
        action: 'user.register.failed_transaction',
        ip,
        userAgent,
        meta: { email: normalizedEmail, error: error.message },
      });
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.',
      );
    }

    this.eventEmitter.emit('user.registered', { user: newUser, otp });
    this.auditService.log({
      action: 'user.register.success',
      actorId: newUser.id,
      ip,
      userAgent,
      meta: { email: normalizedEmail },
    });
    return {
      message:
        'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const { email, otp } = dto;
    const maxAttempts = this.configService.get<number>(
      'EMAIL_VERIFY_MAX_ATTEMPTS',
      5,
    );

    const record = await this.entityManager.findOne(EmailVerification, {
      where: { email, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    if (!record) {
      const user = await this.entityManager.findOne(User, { where: { email } });
      if (user?.status === UserStatus.ACTIVE)
        throw new ConflictException('Tài khoản này đã được xác minh trước đó.');
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    if (record.attemptCount >= maxAttempts) {
      this.auditService.log({
        action: 'user.email.verify.failed_max_attempts',
        actorId: record.userId,
        meta: { email, attempts: record.attemptCount },
      });
      throw new ForbiddenException(
        'Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng yêu cầu mã mới.',
      );
    }

    const isMatch = await this.hashingService.compare(otp, record.codeHash);
    if (!isMatch) {
      await this.entityManager.increment(
        EmailVerification,
        { id: record.id },
        'attemptCount',
        1,
      );
      this.auditService.log({
        action: 'user.email.verify.failed_otp_mismatch',
        actorId: record.userId,
        meta: { email },
      });
      throw new BadRequestException('Mã OTP không hợp lệ.');
    }

    try {
      await this.entityManager.transaction(async (txManager) => {
        await txManager.update(User, record.userId, {
          status: UserStatus.ACTIVE,
        });
        await txManager.update(EmailVerification, record.id, {
          consumedAt: new Date(),
        });
      });
    } catch (error) {
      this.logger.error(
        `Email verification transaction failed for ${email}:`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình xác thực.',
      );
    }

    this.auditService.log({
      action: 'user.email.verify.success',
      actorId: record.userId,
      meta: { email },
    });
    return {
      message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  async resendVerificationOtp(
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.entityManager.findOne(User, {
      where: { email },
      select: ['id', 'email', 'status', 'fullName'],
    });
    if (!user) {
      this.logger.warn(`Resend OTP attempt for non-existent email: ${email}`);
      return {
        message: 'Nếu email tồn tại, chúng tôi đã gửi lại mã xác thực.',
      };
    }
    if (user.status !== UserStatus.PENDING_EMAIL_VERIFY) {
      this.logger.warn(`Resend OTP attempt for already active user: ${email}`);
      return { message: 'Tài khoản này đã được xác thực hoặc không hợp lệ.' };
    }

    const otp = this.generateNumericOTP(6);
    const otpHash = await this.hashingService.hash(otp);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.entityManager.update(
      EmailVerification,
      { userId: user.id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const newVerification = this.entityManager.create(EmailVerification, {
      userId: user.id,
      email: user.email,
      codeHash: otpHash,
      expiresAt,
    });
    await this.entityManager.save(newVerification);

    this.eventEmitter.emit('user.registered', { user, otp });
    this.logger.log(`Resent verification OTP to ${email}`);

    this.auditService.log({
      action: 'user.email.resend_otp',
      actorId: user.id,
      ip,
      userAgent,
      meta: { email },
    });

    return { message: 'Mã xác thực mới đã được gửi đến email của bạn.' };
  }

  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; fullName: string; role: UserRole };
  }> {
    const { email, password } = dto;
    const user = await this.entityManager
      .createQueryBuilder(User, 'user')
      .leftJoinAndSelect('user.credential', 'credential')
      .where('user.email = :email', { email })
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.role',
        'user.status',
        'user.lockedUntil',
        'credential.passwordHash',
      ])
      .getOne();

    if (!user || !user.credential) {
      this.auditService.log({
        action: 'login.failed',
        ip,
        userAgent,
        meta: { email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    if (user.status === UserStatus.PENDING_EMAIL_VERIFY) {
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email.',
      );
    }

    if (
      user.status === UserStatus.LOCKED &&
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {
      const remainingTime = ms(user.lockedUntil.getTime() - Date.now());
      throw new ForbiddenException(
        `Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${remainingTime}.`,
      );
    }

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.credential.passwordHash,
    );
    if (!isPasswordValid) {
      this.auditService.log({
        action: 'login.failed',
        actorId: user.id,
        ip,
        userAgent,
        meta: { email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    await this.entityManager.transaction(async (txManager) => {
      await txManager.update(User, user.id, {
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
        lockedUntil: undefined,
      });
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.getOrThrow('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      },
    );

    const refreshTokenHash = await this.hashingService.hash(refreshToken);
    const expiresAt = new Date(
      Date.now() +
        ms(
          this.configService.get(
            'REFRESH_TOKEN_EXPIRES_IN',
            '7d',
          ) as ms.StringValue,
        ),
    );
    await this.entityManager.save(
      this.entityManager.create(AuthSession, {
        userId: user.id,
        refreshTokenHash,
        roleAtLogin: user.role,
        ip,
        userAgent,
        expiresAt,
      }),
    );

    this.auditService.log({
      action: 'login.success',
      actorId: user.id,
      ip,
      userAgent,
      meta: { email },
    });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, role: user.role },
    };
  }

  private async findAndRevokeSession(
    plainToken: string,
    userId: string,
  ): Promise<AuthSession | null> {
    let revokedSession: AuthSession | null = null;
    await this.entityManager.transaction(async (txManager) => {
      const sessions = await txManager.find(AuthSession, {
        where: {
          userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      });
      for (const session of sessions) {
        const isMatch = await this.hashingService.compare(
          plainToken,
          session.refreshTokenHash,
        );
        if (isMatch) {
          session.revokedAt = new Date();
          await txManager.save(session);
          revokedSession = session;
          break;
        }
      }
    });
    return revokedSession;
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.entityManager.update(
      AuthSession,
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async refreshTokens(
    userId: string,
    oldRefreshToken: string,
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    const revokedSession = await this.findAndRevokeSession(
      oldRefreshToken,
      userId,
    );
    if (!revokedSession) {
      await this.revokeAllUserSessions(userId);
      this.auditService.log({
        action: 'token.refresh.reuse_or_invalid',
        actorId: userId,
      });
      throw new UnauthorizedException(
        'Phiên làm việc không hợp lệ hoặc đã hết hạn.',
      );
    }

    const user = await this.entityManager.findOne(User, {
      where: { id: userId, status: UserStatus.ACTIVE },
      select: ['id', 'role'],
    });
    if (!user) {
      await this.revokeAllUserSessions(userId);
      throw new UnauthorizedException('Người dùng không hợp lệ.');
    }

    const newAccessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    );
    const newRefreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.getOrThrow('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      },
    );

    const newHash = await this.hashingService.hash(newRefreshToken);
    const expiresAt = new Date(
      Date.now() +
        ms(
          this.configService.get(
            'REFRESH_TOKEN_EXPIRES_IN',
            '7d',
          ) as ms.StringValue,
        ),
    );
    await this.entityManager.save(
      this.entityManager.create(AuthSession, {
        userId: user.id,
        refreshTokenHash: newHash,
        roleAtLogin: revokedSession.roleAtLogin,
        ip: revokedSession.ip,
        userAgent: revokedSession.userAgent,
        expiresAt,
      }),
    );

    this.auditService.log({
      action: 'token.refresh.success',
      actorId: user.id,
    });
    return { newAccessToken, newRefreshToken };
  }

  async handleLogout(
    refreshToken: string | undefined,
    userId: string,
  ): Promise<{ message: string }> {
    if (!refreshToken) {
      this.auditService.log({
        action: 'user.logout.no_token',
        actorId: userId,
      });
      return { message: 'Đăng xuất thành công.' };
    }
    const hashed = await this.hashingService.hash(refreshToken);
    await this.entityManager.update(
      AuthSession,
      { userId, refreshTokenHash: hashed, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    this.auditService.log({ action: 'user.logout.success', actorId: userId });
    return { message: 'Đăng xuất thành công.' };
  }

  async handleForgotPassword(
    dto: ForgotPasswordDto,
    ip: string,
  ): Promise<void> {
    const { email } = dto;
    const user = await this.usersService.findOneByEmail(email);
    if (!user || user.status !== UserStatus.ACTIVE) {
      this.logger.warn(
        `Forgot password attempt for non-existent or inactive email: ${email}`,
      );
      return;
    }
    const otp = this.generateNumericOTP(6);
    const codeHash = await this.hashingService.hash(otp);
    await this.entityManager.transaction(async (manager) => {
      await manager.update(
        PasswordResetRequest,
        { userId: user.id, consumedAt: IsNull() },
        { consumedAt: new Date() },
      );
      await manager.save(
        manager.create(PasswordResetRequest, {
          userId: user.id,
          email: user.email,
          codeHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        }),
      );
    });
    this.eventEmitter.emit('auth.password_reset_requested', {
      email: user.email,
      fullName: user.fullName,
      otp,
    });
    await this.auditService.log({
      action: 'AUTH_FORGOT_PASSWORD_REQUESTED',
      actorId: user.id,
      ip,
      details: { email: user.email },
    });
  }

  async handleResetPassword(dto: ResetPasswordDto, ip: string): Promise<void> {
    const { email, otp, newPassword, confirmNewPassword } = dto;
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Xác nhận mật khẩu mới không khớp.');
    }
    const request = await this.passwordResetRepo.findOne({
      where: { email, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!request || request.expiresAt < new Date()) {
      throw new BadRequestException(
        'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      );
    }
    const isValid = await this.hashingService.compare(otp, request.codeHash);
    if (!isValid) throw new BadRequestException('Mã xác thực không chính xác.');

    const newHash = await this.hashingService.hash(newPassword);
    await this.entityManager.transaction(async (manager) => {
      await manager.update(
        UserCredential,
        { userId: request.userId },
        { passwordHash: newHash, passwordUpdatedAt: new Date() },
      );
      await manager.update(
        PasswordResetRequest,
        { id: request.id },
        { consumedAt: new Date() },
      );
      await manager.update(
        AuthSession,
        { userId: request.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });
    await this.auditService.log({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      actorId: request.userId,
      ip,
      details: { email },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      relations: ['credential'],
    });
    if (!user) throw new NotFoundException('User not found');
    const isValid = await this.hashingService.compare(
      dto.currentPassword,
      user.credential!.passwordHash,
    );
    if (!isValid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    const newHash = await this.hashingService.hash(dto.newPassword);
    await this.entityManager.update(
      UserCredential,
      { userId },
      { passwordHash: newHash, passwordUpdatedAt: new Date() },
    );
    await this.revokeAllUserSessions(userId);
    return { message: 'Đổi mật khẩu thành công' };
  }
}
