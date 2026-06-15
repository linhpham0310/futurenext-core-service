// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashingService } from '@/shared/providers/hashing/hashing.service';
import { AuditService } from '@/shared/providers/audit/audit.service';
import { UsersService } from '@/modules/users/services/users.service';
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity';
import { EmailVerification } from '../entities/email-verification.entity';
import { AuthSession } from '../entities/auth-session.entity';
import { PasswordResetRequest } from '../entities/password-reset-request.entity';

describe('AuthService', () => {
  let service: AuthService;

  // Mocks
  const mockEntityManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    transaction: jest.fn(async (callback) => callback(mockEntityManager)),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  const mockHashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUsersService = {
    findOneByEmail: jest.fn(),
  };

  const mockPasswordResetRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(async (callback) => callback(mockEntityManager)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (mockConfigService.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          CURRENT_CONSENT_VERSION: 'v1',
          EMAIL_VERIFY_MAX_ATTEMPTS: 5,
          JWT_SECRET: 'test-secret',
          REFRESH_TOKEN_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          REFRESH_TOKEN_EXPIRES_IN: '7d',
        };
        return config[key] ?? defaultValue;
      },
    );

    (mockConfigService.getOrThrow as jest.Mock).mockImplementation(
      (key: string) => {
        const config = {
          JWT_SECRET: 'test-secret',
          REFRESH_TOKEN_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '15m',
          REFRESH_TOKEN_EXPIRES_IN: '7d',
        };
        return config[key];
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: HashingService, useValue: mockHashingService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: getRepositoryToken(PasswordResetRequest),
          useValue: mockPasswordResetRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ============================================================
  // TESTS FOR register() - 3 test cases
  // ============================================================
  describe('register()', () => {
    const registerDto = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      agreeTerms: true,
      role: 'student' as const,
    };
    const ip = '127.0.0.1';
    const userAgent = 'TestAgent';

    it('should successfully register a new user', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      mockHashingService.hash.mockResolvedValue('hashed-password');

      const mockUser = { id: 'user-1', email: registerDto.email };
      mockEntityManager.transaction.mockImplementation(async (callback) =>
        callback(mockEntityManager),
      );
      mockEntityManager.create.mockReturnValue(mockUser);
      mockEntityManager.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto, ip, userAgent);

      expect(result).toEqual({
        message: expect.stringContaining('Đăng ký thành công'),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        id: 'existing',
        email: registerDto.email,
      });

      await expect(
        service.register(registerDto, ip, userAgent),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const invalidDto = {
        ...registerDto,
        confirmPassword: 'DifferentPassword',
        role: 'student' as const,
      };

      await expect(service.register(invalidDto, ip, userAgent)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // TESTS FOR verifyEmail() - 6 test cases
  // ============================================================
  // src/modules/auth/auth.service.spec.ts

  describe('verifyEmail()', () => {
    const verifyDto = { email: 'test@example.com', otp: '123456' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // TEST 1: Thành công
    it('should successfully verify email', async () => {
      const verificationRecord = {
        id: 'verify-1',
        userId: 'user-1',
        email: verifyDto.email,
        codeHash: 'hashed-123456',
        expiresAt: new Date(Date.now() + 3600000),
        attemptCount: 0,
      };

      // Lần 1: tìm EmailVerification -> tìm thấy
      mockEntityManager.findOne.mockResolvedValueOnce(verificationRecord);
      // Lần 2: không cần tìm User vì đã có verificationRecord
      // Mock compare OTP thành công
      mockHashingService.compare.mockResolvedValue(true);
      // Mock transaction
      mockEntityManager.transaction.mockImplementation(async (callback) =>
        callback(mockEntityManager),
      );
      mockEntityManager.update.mockResolvedValue({ affected: 1 });

      const result = await service.verifyEmail(verifyDto);

      expect(result).toEqual({
        message: expect.stringContaining('Xác thực email thành công'),
      });
    });

    // TEST 2: OTP sai
    it('should throw BadRequestException if OTP is invalid', async () => {
      const verificationRecord = {
        id: 'verify-1',
        attemptCount: 2,
        userId: 'user-1',
        codeHash: 'hashed-123456',
        expiresAt: new Date(Date.now() + 3600000),
      };
      // Lần 1: tìm EmailVerification -> tìm thấy
      mockEntityManager.findOne.mockResolvedValueOnce(verificationRecord);
      // Mock compare OTP sai
      mockHashingService.compare.mockResolvedValue(false);
      mockEntityManager.increment.mockResolvedValue({});

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // TEST 3: Không tìm thấy OTP, user chưa active
    it('should throw BadRequestException if OTP not found and user not active', async () => {
      // Lần 1: tìm EmailVerification -> không tìm thấy
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      // Lần 2: tìm User -> tìm thấy, user chưa active
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'user-1',
        status: UserStatus.PENDING_EMAIL_VERIFY,
      });

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // TEST 4: Max attempts exceeded
    it('should throw ForbiddenException if max attempts exceeded', async () => {
      const verificationRecord = {
        id: 'verify-1',
        attemptCount: 5,
        userId: 'user-1',
        codeHash: 'hashed-123456',
        expiresAt: new Date(Date.now() + 3600000),
      };
      // Lần 1: tìm EmailVerification -> tìm thấy
      mockEntityManager.findOne.mockResolvedValueOnce(verificationRecord);

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    // TEST 5: OTP expired (không tìm thấy OTP)
    it('should throw BadRequestException if OTP has expired', async () => {
      // Lần 1: tìm EmailVerification -> không tìm thấy (vì đã hết hạn)
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      // Lần 2: tìm User -> tìm thấy, user chưa active
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'user-1',
        status: UserStatus.PENDING_EMAIL_VERIFY,
      });

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // TEST 6: User already active
    it('should throw ConflictException if user already active', async () => {
      // Lần 1: tìm EmailVerification -> không tìm thấy
      mockEntityManager.findOne.mockResolvedValueOnce(null);
      // Lần 2: tìm User -> tìm thấy, user đã ACTIVE
      mockEntityManager.findOne.mockResolvedValueOnce({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ============================================================
  // TESTS FOR login() - 5 test cases
  // ============================================================
  describe('login()', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123' };
    const ip = '127.0.0.1';
    const userAgent = 'TestAgent';

    const mockUser = {
      id: 'user-1',
      email: loginDto.email,
      fullName: 'Test User',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      credential: { passwordHash: 'hashed-password' },
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      mockEntityManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should successfully login and return tokens', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');
      mockHashingService.hash.mockResolvedValue('hashed-refresh-token');
      mockEntityManager.create.mockReturnValue({ id: 'session-1' });
      mockEntityManager.save.mockResolvedValue({});
      mockEntityManager.transaction.mockImplementation(async (cb) =>
        cb(mockEntityManager),
      );

      const result = await service.login(loginDto, ip, userAgent);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('id', 'user-1');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException if email not verified', async () => {
      const unverifiedUser = {
        ...mockUser,
        status: UserStatus.PENDING_EMAIL_VERIFY,
      };
      mockQueryBuilder.getOne.mockResolvedValue(unverifiedUser);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        status: UserStatus.LOCKED,
        lockedUntil: new Date(Date.now() + 3600000),
      };
      mockQueryBuilder.getOne.mockResolvedValue(lockedUser);

      await expect(service.login(loginDto, ip, userAgent)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // TESTS FOR refreshTokens() - 2 test cases
  // ============================================================
  describe('refreshTokens()', () => {
    const userId = 'user-1';
    const oldRefreshToken = 'valid-refresh-token';

    it('should successfully refresh tokens', async () => {
      const revokedSession = {
        id: 'session-1',
        roleAtLogin: UserRole.STUDENT,
        ip: '127.0.0.1',
        userAgent: 'TestAgent',
      };
      const user = {
        id: userId,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      };

      mockHashingService.hash.mockResolvedValue('hashed-old-token');
      mockEntityManager.findOne.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('new-access-token');
      mockHashingService.hash.mockResolvedValue('hashed-new-token');
      mockEntityManager.create.mockReturnValue({ id: 'new-session' });
      mockEntityManager.save.mockResolvedValue({});

      jest
        .spyOn(service as any, 'findAndRevokeSession')
        .mockResolvedValue(revokedSession);

      const result = await service.refreshTokens(userId, oldRefreshToken);

      expect(result).toHaveProperty('newAccessToken');
      expect(result).toHaveProperty('newRefreshToken');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockHashingService.hash.mockResolvedValue('hashed-token');
      jest
        .spyOn(service as any, 'findAndRevokeSession')
        .mockResolvedValue(null);
      jest.spyOn(service as any, 'revokeAllUserSessions').mockResolvedValue(1);

      await expect(
        service.refreshTokens(userId, 'invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // TESTS FOR handleForgotPassword() - 2 test cases
  // ============================================================
  describe('handleForgotPassword()', () => {
    const dto = { email: 'test@example.com' };
    const ip = '127.0.0.1';

    it('should silently fail if email not found (security)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.handleForgotPassword(dto, ip);

      expect(result).toBeUndefined();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should generate OTP and emit event for existing user', async () => {
      const user = {
        id: 'user-1',
        email: dto.email,
        status: UserStatus.ACTIVE,
      };
      mockUsersService.findOneByEmail.mockResolvedValue(user);
      mockHashingService.hash.mockResolvedValue('hashed-otp');
      mockEntityManager.transaction.mockImplementation(async (callback) =>
        callback(mockEntityManager),
      );
      mockEntityManager.update.mockResolvedValue({ affected: 1 });
      mockEntityManager.create.mockReturnValue({});
      mockEntityManager.save.mockResolvedValue({});
      await service.handleForgotPassword(dto, ip);
      expect(mockEntityManager.transaction).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  // ============================================================
  // TESTS FOR handleResetPassword() - 3 test cases
  // ============================================================
  describe('handleResetPassword()', () => {
    const dto = {
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'NewPassword123',
      confirmNewPassword: 'NewPassword123',
    };
    const ip = '127.0.0.1';

    it('should throw BadRequestException if OTP not found', async () => {
      mockPasswordResetRepo.findOne.mockResolvedValue(null);

      await expect(service.handleResetPassword(dto, ip)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if OTP is incorrect', async () => {
      const request = {
        id: 'req-1',
        userId: 'user-1',
        codeHash: 'hashed-123456',
        expiresAt: new Date(Date.now() + 900000),
      };
      mockPasswordResetRepo.findOne.mockResolvedValue(request);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.handleResetPassword(dto, ip)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully reset password', async () => {
      const request = {
        id: 'req-1',
        userId: 'user-1',
        codeHash: 'hashed-123456',
        expiresAt: new Date(Date.now() + 900000),
      };
      mockPasswordResetRepo.findOne.mockResolvedValue(request);
      mockHashingService.compare.mockResolvedValue(true);
      mockHashingService.hash.mockResolvedValue('new-hashed-password');
      mockEntityManager.transaction.mockImplementation(async (callback) =>
        callback(mockEntityManager),
      );
      mockEntityManager.update.mockResolvedValue({ affected: 1 });
      await service.handleResetPassword(dto, ip);
      expect(mockEntityManager.transaction).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
    it('should throw BadRequestException if confirm password does not match', async () => {
      const invalidDto = { ...dto, confirmNewPassword: 'DifferentPassword' };
      await expect(service.handleResetPassword(invalidDto, ip)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
