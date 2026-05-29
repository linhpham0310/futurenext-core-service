// src/modules/auth/services/auth.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from '../dto/register.dto';
import { HashingService } from '@/shared/providers/hashing/hashing.service'; // Từ S1-BE-01
import {
  AuditService,
  AuditLogPayload,
} from '@/shared/providers/audit/audit.service'; // Từ S1-BE-01
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity';
import { UserCredential } from '@/modules/users/entities/user-credential.entity';
import { UserConsent } from '@/modules/users/entities/user-consent.entity';
import { EmailVerification } from '../entities/email-verification.entity';
import { randomInt } from 'crypto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthSession } from '../entities/auth-session.entity';
import { LoginDto } from '../dto/login.dto';
import ms from 'ms';
import { PasswordResetRequest } from '../entities/password-reset-request.entity';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    // Inject EntityManager để quản lý transaction
    @InjectEntityManager() private readonly entityManager: EntityManager,
    // Inject các service dùng chung đã tạo
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService, // <<<--- INJECT JwtService
    // Inject LoginAttemptService nếu có
    // private readonly loginAttemptService: LoginAttemptService,
    @InjectRepository(PasswordResetRequest)
    private readonly passwordResetRepo: Repository<PasswordResetRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Finds an active (not revoked, not expired) AuthSession by its hashed refresh token,
   * marks it as revoked, and returns the original session record.
   * Executes within a transaction to ensure atomicity.
   * @param hashedToken - The hashed refresh token to search for.
   * @param userId - The user ID associated with the token (for extra security check).
   * @returns The revoked AuthSession record if found and updated, otherwise null.
   */
  private async findAndRevokeSession(
    hashedToken: string,
    userId: string,
  ): Promise<AuthSession | null> {
    let revokedSession: AuthSession | null = null;
    const now = new Date();
    this.logger.verbose(
      `Attempting to find and revoke session for user ${userId} with token hash`,
    );

    try {
      await this.entityManager.transaction(async (txManager) => {
        // Find the specific session matching the hash, user, not revoked, and not expired
        const session = await txManager.findOne(AuthSession, {
          where: {
            refreshTokenHash: hashedToken,
            userId: userId, // Ensure the token belongs to the requesting user
            revokedAt: IsNull(), // Ensure it hasn't been revoked already
            expiresAt: MoreThan(now), // Ensure it hasn't expired
          },
        });

        if (session) {
          // If found, mark it as revoked by setting the revokedAt timestamp
          session.revokedAt = now;
          await txManager.save(AuthSession, session); // Save the change within the transaction
          revokedSession = session; // Store the found session to return it
          this.logger.log(`Session ${session.id} revoked for user ${userId}`);
        } else {
          this.logger.warn(
            `No active, unrevoked session found for user ${userId} with the provided token hash.`,
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `Transaction failed during findAndRevokeSession for user ${userId}:`,
        error.stack,
      );
      // Do not throw Unauthorized here, let the main refreshTokens logic handle null return
      // Throw InternalServerError only for unexpected DB errors
      throw new InternalServerErrorException(
        'Lỗi cơ sở dữ liệu khi xử lý phiên làm việc.',
      );
    }

    return revokedSession; // Return the session that was just revoked, or null if none was found/revoked
  }

  /**
   * Handles the user registration process.
   * @param dto - Validated registration data.
   * @param ip - IP address of the request origin.
   * @param userAgent - User agent string of the client.
   * @returns Success message upon successful registration.
   * @throws ConflictException if email already exists.
   * @throws InternalServerErrorException on unexpected errors.
   */
  async register(
    dto: RegisterDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Email đã được chuẩn hóa bởi DTO transformer
    const normalizedEmail = dto.email;

    // THÊM: Validate confirmPassword
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp.');
    }

    // 1. Kiểm tra email đã tồn tại (BR-Unique Email) [cite: 2159-2163]
    // Nên thực hiện kiểm tra này bên trong transaction để tránh race condition,
    // nhưng kiểm tra bên ngoài trước giúp phản hồi nhanh hơn nếu email đã tồn tại.
    const existingUser = await this.entityManager.findOne(User, {
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      // Ghi log audit cho lần thử đăng ký trùng email (tùy chọn)
      this.auditService.log({
        action: 'user.register.failed_email_exists',
        ip,
        userAgent,
        meta: { email: normalizedEmail },
      });
      throw new ConflictException('Email đã tồn tại.');
    }

    // 2. Hash mật khẩu (BR-Password Policy đã được DTO kiểm tra) [cite: 2164]
    const hashedPassword = await this.hashingService.hash(dto.password);

    // 3. Chuẩn bị thông tin cho OTP email verification [cite: 2186-2192]
    const otpLength = 6;
    const otp = this.generateNumericOTP(otpLength);
    const otpHash = await this.hashingService.hash(otp); // Hash OTP -> Bảo mật [cite: 2062-2064]
    const otpExpiresInHours = 24; // BR: TTL 24h [cite: 2186]
    const otpExpiresAt = new Date();
    otpExpiresAt.setHours(otpExpiresAt.getHours() + otpExpiresInHours);

    let newUser: User; // Biến để lưu user mới tạo

    // 4. Thực hiện tạo các bản ghi trong Transaction CSDL [cite: 2166]
    // Đảm bảo tất cả thành công hoặc không gì cả -> Toàn vẹn dữ liệu
    try {
      newUser = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // a. Tạo User (BR-User info defaults) [cite: 2167-2177]
          const user = transactionalEntityManager.create(User, {
            fullName: dto.fullName,
            email: normalizedEmail, // Lưu email đã chuẩn hóa
            role: dto.role === 'teacher' ? UserRole.TEACHER : UserRole.STUDENT, // thay role: UserRole.STUDENT,
            status: UserStatus.PENDING_EMAIL_VERIFY, // Status mặc định
            locale: 'vi-VN', // Locale mặc định
            timezone: 'Asia/Bangkok', // Timezone mặc định
          });
          const savedUser = await transactionalEntityManager.save(user);
          // b. Tạo UserCredential [cite: 2178-2179]
          await transactionalEntityManager.save(
            transactionalEntityManager.create(UserCredential, {
              userId: savedUser.id,
              passwordHash: hashedPassword,
              passwordAlgo: 'bcrypt', // Có thể bỏ qua nếu DB có default
              passwordUpdatedAt: new Date(), // Set thời điểm tạo hash
            }),
          );

          // c. Ghi nhận Consent (BR-Consent) [cite: 2180-2185]
          const consentVersion = this.configService.get<string>(
            'CURRENT_CONSENT_VERSION',
            'unknown_version',
          ); // Đọc version từ config
          await transactionalEntityManager.save(
            transactionalEntityManager.create(UserConsent, {
              userId: savedUser.id,
              consentVersion: consentVersion,
              consentTimestamp: new Date(), // Thời điểm đồng ý
              ipAddress: ip, // Lưu IP -> Audit [cite: 1537]
              userAgent: userAgent, // Lưu User Agent -> Audit [cite: 1538]
            }),
          );

          // d. Tạo EmailVerification (OTP) [cite: 2186-2192]
          await transactionalEntityManager.save(
            transactionalEntityManager.create(EmailVerification, {
              userId: savedUser.id,
              email: normalizedEmail, // Lưu email lúc gửi
              codeHash: otpHash, // Lưu hash OTP
              expiresAt: otpExpiresAt, // Thời điểm hết hạn
              // consumedAt: null (mặc định)
              // attemptCount: 0 (mặc định)
            }),
          );

          return savedUser;

          // Lưu ý: Không RETURN { newUser, otp } từ transaction vì otp là plain text, không nên truyền qua nhiều lớp.
          // newUser đã được gán vào biến bên ngoài transaction.
        },
      ); // Kết thúc transaction thành công
    } catch (error) {
      this.logger.error(
        `Registration transaction failed for ${normalizedEmail}:`,
        error.stack,
      );
      // Ghi log audit lỗi transaction (tùy chọn)
      this.auditService.log({
        action: 'user.register.failed_transaction',
        ip,
        userAgent,
        meta: { email: normalizedEmail, error: error.message },
      });
      // Ném lỗi chung để Controller xử lý
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại.',
      );
    }

    // Đảm bảo newUser đã được tạo sau transaction thành công
    if (!newUser) {
      // Trường hợp này rất hiếm khi transaction không báo lỗi nhưng newUser lại null
      this.logger.error(
        `User object is null after successful transaction for ${normalizedEmail}`,
      );
      throw new InternalServerErrorException(
        'Lỗi không xác định sau khi đăng ký.',
      );
    }

    // 5. Phát sự kiện để gửi email xác thực (Async) (BR-Gửi email xác minh)
    // Gửi cả newUser và otp (plain text) cho listener xử lý
    try {
      this.eventEmitter.emit('user.registered', { user: newUser, otp });
      this.logger.log(`'user.registered' event emitted for ${newUser.email}`);
    } catch (error) {
      // Lỗi này không nên xảy ra với EventEmitter mặc định, nhưng log lại nếu có
      this.logger.error(
        `Failed to emit 'user.registered' event for ${newUser.email}:`,
        error.stack,
      );
      // Không nên throw lỗi ở đây để không ảnh hưởng đến response thành công cho user
    }

    // 6. Ghi log audit thành công (BR-Audit) [cite: 2196-2197, 2031]
    this.auditService.log({
      action: 'user.register.success', // Đổi action thành success
      actorId: newUser.id, // ID của user vừa tạo
      ip,
      userAgent,
      meta: { email: normalizedEmail, userId: newUser.id }, // Thêm userId vào meta
    });
    this.logger.log(
      `Audit log recorded for successful registration: ${newUser.email}`,
    );

    // 7. Trả về thông báo thành công cho Controller
    return {
      message:
        'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  /**
   * Generates a secure numeric OTP of a specified length.
   * @param length The desired length of the OTP (e.g., 6).
   * @returns A string representing the numeric OTP.
   */
  private generateNumericOTP(length: number = 6): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    // Use crypto.randomInt for cryptographically secure random numbers
    return randomInt(min, max + 1)
      .toString()
      .padStart(length, '0');
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const email = dto.email; // Email đã được validate cơ bản bởi DTO
    const otpSubmitted = dto.otp;
    this.logger.log(`Attempting email verification for: ${email}`);

    const maxAttempts = this.configService.get<number>(
      'EMAIL_VERIFY_MAX_ATTEMPTS',
      5,
    );

    // 1. Tìm bản ghi OTP hợp lệ gần nhất (chưa dùng, chưa hết hạn)
    // Sử dụng EntityManager để truy vấn
    const verificationRecord = await this.entityManager.findOne(
      EmailVerification,
      {
        where: {
          email, // Tìm theo email (citext sẽ xử lý case-insensitivity)
          consumedAt: IsNull(), // Chỉ lấy mã chưa được sử dụng [cite: 2478]
          expiresAt: MoreThan(new Date()), // Chỉ lấy mã chưa hết hạn [cite: 2480]
        },
        order: { createdAt: 'DESC' }, // Lấy mã mới nhất nếu có nhiều mã hợp lệ
        // relations: ['user'], // Load luôn user nếu cần kiểm tra status ngay
      },
    );

    // --- Xử lý các luồng lỗi ---

    // 2. Lỗi: Mã không tồn tại, đã dùng, hoặc đã hết hạn (chung) [cite: 2591-2592]
    if (!verificationRecord) {
      this.logger.warn(
        `Verification failed for ${email}: No valid OTP record found.`,
      );
      // Kiểm tra xem tài khoản có tồn tại và đã active chưa để đưa ra thông báo cụ thể hơn
      const user = await this.entityManager.findOne(User, {
        where: { email: email },
      });
      if (user && user.status === UserStatus.ACTIVE) {
        // [cite: 2593-2596]
        throw new ConflictException('Tài khoản này đã được xác minh trước đó.');
      }

      if (!user) {
        throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
      // Ghi log audit thất bại (lý do: mã không hợp lệ)
      this.auditService.log({
        action: 'user.email.verify.failed_invalid_code',
        meta: { email },
      });
      throw new BadRequestException(
        'Mã OTP không hợp lệ, đã được sử dụng hoặc đã hết hạn.',
      );
    }

    // 3. Lỗi: Mã đã hết hạn (kiểm tra lại cho chắc chắn, dù query đã lọc) [cite: 2598-2599]
    // (Thực tế, query `MoreThan(new Date())` đã loại trừ trường hợp này, nhưng thêm để rõ ràng)
    // if (verificationRecord.expiresAt < new Date()) {
    //   this.logger.warn(`Verification failed for ${email}: OTP expired (ID: ${verificationRecord.id})`);
    //   this.auditService.log({ action: 'user.email.verify.failed_expired', actorId: verificationRecord.userId, meta: { email }});
    //   throw new GoneException('Mã OTP đã hết hạn.');
    // }

    // 4. Lỗi: Chống Brute-force - Vượt quá số lần thử
    const maxVerifyAttempts = 5; // Nên đọc từ ConfigService
    if (verificationRecord.attemptCount >= maxVerifyAttempts) {
      this.logger.warn(
        `Verification locked for ${email}: Max attempts exceeded (ID: ${verificationRecord.id})`,
      );
      // Ghi log audit bị khóa do brute-force
      this.auditService.log({
        action: 'user.email.verify.failed_max_attempts',
        actorId: verificationRecord.userId,
        meta: { email, attempts: verificationRecord.attemptCount },
      });

      // Tùy chọn: Vô hiệu hóa mã này vĩnh viễn sau khi bị khóa
      // await this.entityManager.update(EmailVerification, verificationRecord.id, { consumedAt: new Date() });
      // this.logger.log(`Consumed OTP ${verificationRecord.id} due to max attempts.`);

      throw new ForbiddenException(
        `Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng yêu cầu mã mới hoặc liên hệ hỗ trợ.`,
      );
    }

    // 5. So sánh hash của OTP [cite: 2608-2609]
    const isOtpMatch = await this.hashingService.compare(
      otpSubmitted,
      verificationRecord.codeHash,
    );

    // 6. Lỗi: Mã OTP không khớp [cite: 2610-2613]
    if (!isOtpMatch) {
      // Tăng bộ đếm lỗi
      await this.entityManager.increment(
        EmailVerification,
        { id: verificationRecord.id },
        'attemptCount',
        1,
      );
      const newAttemptCount = verificationRecord.attemptCount + 1;
      this.logger.warn(
        `Verification failed for ${email}: Invalid OTP submitted (Attempt ${newAttemptCount}/${maxAttempts}, ID: ${verificationRecord.id})`,
      );
      // Ghi log audit nhập sai
      this.auditService.log({
        action: 'user.email.verify.failed_otp_mismatch',
        actorId: verificationRecord.userId,
        meta: { email, attempt: newAttemptCount },
      });
      throw new BadRequestException('Mã OTP không hợp lệ.');
    }

    // --- LUỒNG THÀNH CÔNG ---
    this.logger.log(
      `OTP verification successful for ${email} (ID: ${verificationRecord.id})`,
    );

    // 7. Bắt đầu transaction để cập nhật User và EmailVerification [cite: 2615-2616]
    try {
      await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          // a. Kích hoạt tài khoản người dùng [cite: 2617-2618]
          const updateResult = await transactionalEntityManager.update(
            User,
            verificationRecord.userId,
            {
              status: UserStatus.ACTIVE,
              // Có thể reset lockedUntil về null nếu muốn mở khóa luôn khi verify thành công
              // lockedUntil: null,
            },
          );

          // Kiểm tra xem user có thực sự được cập nhật không (phòng trường hợp user bị xóa)
          if (updateResult.affected === 0) {
            this.logger.error(
              `Failed to activate user ${verificationRecord.userId}: User not found during transaction.`,
            );
            throw new InternalServerErrorException(
              'Không thể kích hoạt tài khoản người dùng.',
            );
          }

          // b. Đánh dấu OTP đã được sử dụng (consume) [cite: 2619-2620]
          await transactionalEntityManager.update(
            EmailVerification,
            verificationRecord.id,
            {
              consumedAt: new Date(),
            },
          );
          this.logger.log(
            `Consumed OTP ${verificationRecord.id} for user ${verificationRecord.userId}`,
          );
        },
      ); // Kết thúc transaction thành công
      this.logger.log(
        `User ${verificationRecord.userId} activated and OTP consumed.`,
      );
    } catch (error) {
      this.logger.error(
        `Email verification transaction failed for ${email}:`,
        error.stack,
      );
      this.auditService.log({
        action: 'user.email.verify.failed_transaction',
        actorId: verificationRecord.userId,
        meta: { email: email, error: error.message },
      });
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.',
      );
    }

    // 8. Ghi log audit thành công
    const auditPayload: AuditLogPayload = {
      action: 'user.email.verify.success',
      actorId: verificationRecord.userId,
      meta: { email: email },
    };
    this.auditService.log(auditPayload);
    this.logger.log(`Audit log recorded for successful verification: ${email}`);

    // 9. Trả về thông báo thành công [cite: 2623, 2447-2450]
    return {
      message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  /**
   * Handles user login attempts.
   * Includes checks for email verification, account locks, password matching,
   * implements lockout mechanism on repeated failures, and generates JWTs upon success.
   * @param dto - Validated login credentials (email, password).
   * @param ip - IP address of the request origin.
   * @param userAgent - User agent string of the client.
   * @returns An object containing the access token, refresh token (to be set in cookie), and user info.
   * @throws UnauthorizedException for invalid credentials.
   * @throws ForbiddenException if account is unverified or locked.
   * @throws InternalServerErrorException on unexpected errors.
   */
  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; fullName: string; role: UserRole };
  }> {
    const email = dto.email; // Đã chuẩn hóa ở DTO
    this.logger.log(`Login attempt for email: ${email}`);
    let user: User | null = null; // Khai báo user ở scope rộng hơn

    try {
      // 1. Tìm user và credential (quan trọng: lấy cả credential)
      // Dùng query builder để join và chỉ lấy các trường cần thiết, bao gồm cả passwordHash
      user = await this.entityManager
        .createQueryBuilder(User, 'user')
        .leftJoinAndSelect('user.credential', 'credential') // Join và select credential
        .where('user.email = :email', { email })
        .select([
          // Chỉ định rõ các trường cần lấy để tối ưu
          'user.id',
          'user.email',
          'user.fullName',
          'user.role',
          'user.status',
          'user.lockedUntil',
          'credential.passwordHash',
          'credential.userId', // Cần userId để đảm bảo join thành công
        ])
        .getOne();

      // 2. Lỗi: User không tồn tại
      if (!user || !user.credential) {
        this.logger.warn(`Login failed: User not found - ${email}`);
        this.auditService.log({
          action: 'login.failed',
          ip,
          userAgent,
          meta: { email, reason: 'user_not_found' },
        });
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng.'); // Thông báo chung chung -> Bảo mật
      }

      // 3. [UC02.6] Gate Verify Email: Kiểm tra email đã xác thực
      if (user.status === UserStatus.PENDING_EMAIL_VERIFY) {
        this.logger.warn(
          `Login failed: Email not verified - ${email} (User ID: ${user.id})`,
        );
        this.auditService.log({
          action: 'login.failed',
          actorId: user.id,
          ip,
          userAgent,
          meta: { email, reason: 'email_not_verified' },
        });
        throw new ForbiddenException(
          'Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email.',
        );
      }

      // 4. [UC02.5] Lockout Check (DB): Kiểm tra tài khoản bị khóa vĩnh viễn hoặc tạm thời
      if (user.status === UserStatus.LOCKED) {
        // Kiểm tra khóa tạm thời
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          this.logger.warn(
            `Login failed: Account locked (DB) - ${email} (User ID: ${user.id}) until ${user.lockedUntil}`,
          );
          this.auditService.log({
            action: 'login.failed',
            actorId: user.id,
            ip,
            userAgent,
            meta: {
              email,
              reason: 'account_locked_db',
              lockedUntil: user.lockedUntil,
            },
          });
          // Tính thời gian còn lại (cần hàm helper hoặc thư viện)
          const remainingTime = ms(user.lockedUntil.getTime() - Date.now(), {
            long: true,
          });
          throw new ForbiddenException(
            `Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau ${remainingTime}.`,
          );
        } else if (!user.lockedUntil) {
          // Trường hợp bị khóa vĩnh viễn (status='locked' nhưng lockedUntil là null) - tùy nghiệp vụ
          this.logger.warn(
            `Login failed: Account permanently locked (DB) - ${email} (User ID: ${user.id})`,
          );
          this.auditService.log({
            action: 'login.failed',
            actorId: user.id,
            ip,
            userAgent,
            meta: { email, reason: 'account_locked_permanent' },
          });
          throw new ForbiddenException(`Tài khoản này đã bị khóa.`);
        }
        // Nếu lockedUntil đã qua, coi như hết khóa tạm thời, tiếp tục kiểm tra mật khẩu
        this.logger.log(
          `Account lock expired for ${email}. Proceeding with login.`,
        );
      }

      // TODO: 4b. [UC02.5] Lockout Check (Cache/Redis): Kiểm tra khóa tạm thời từ cache (nếu dùng LoginAttemptService)
      // const isLockedByCache = await this.loginAttemptService.checkLockout(email);
      // if (isLockedByCache) {
      //    this.logger.warn(`Login failed: Account locked (Cache) - ${email}`);
      //    this.auditService.log({ action: 'login.failed', actorId: user.id, ip, userAgent, meta: { email, reason: 'account_locked_cache' }});
      //    throw new ForbiddenException(`Bạn đã thử quá nhiều lần. Tài khoản bị khóa tạm thời.`);
      // }

      // 5. So sánh mật khẩu
      const isPasswordMatch = await this.hashingService.compare(
        dto.password,
        user.credential.passwordHash,
      );

      // 6. Xử lý khi Mật khẩu SAI
      if (!isPasswordMatch) {
        this.logger.warn(
          `Login failed: Invalid password - ${email} (User ID: ${user.id})`,
        );
        const failedAttempts = 1; // Giá trị mặc định nếu không dùng Redis

        // --- [UC02.5] Ghi nhận thất bại và kiểm tra lockout ---
        // (Logic với Redis - nếu dùng LoginAttemptService)
        // failedAttempts = await this.loginAttemptService.incrementFailure(email);
        // this.logger.log(`Failed login attempt ${failedAttempts} for ${email}`);

        // // Kiểm tra ngưỡng lockout (ví dụ: 10 lần)
        // const loginFailureLimit = this.configService.get<number>('LOGIN_FAILURE_LIMIT', 10);
        // if (failedAttempts >= loginFailureLimit) {
        //   const lockDurationMs = ms(this.configService.get<string>('LOGIN_LOCKOUT_DURATION', '15m')); // Đọc thời gian khóa từ config
        //   const lockedUntil = new Date(Date.now() + lockDurationMs);

        //   // Cập nhật CSDL để khóa tài khoản
        //   await this.entityManager.update(User, user.id, { status: UserStatus.LOCKED, lockedUntil });
        //   this.logger.warn(`Account locked (DB) due to too many failed attempts: ${email} until ${lockedUntil}`);
        //   this.auditService.log({ action: 'login.failed_locked', actorId: user.id, ip, userAgent, meta: { email, attempts: failedAttempts } });

        //   // Reset bộ đếm lỗi trong Redis sau khi khóa DB
        //   await this.loginAttemptService.resetFailures(email);

        //   throw new ForbiddenException(`Bạn đã nhập sai mật khẩu quá nhiều lần. Tài khoản bị khóa trong ${ms(lockDurationMs, { long: true })}.`);
        // }
        // (Kết thúc logic với Redis)

        // Ghi log audit cho lần nhập sai (luôn ghi)
        this.auditService.log({
          action: 'login.failed',
          actorId: user.id,
          ip,
          userAgent,
          meta: { email, reason: 'invalid_password', attempts: failedAttempts },
        });
        // Ném lỗi 401
        throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
      }

      // --- LUỒNG THÀNH CÔNG: Mật khẩu ĐÚNG ---
      this.logger.log(`Login successful for: ${email} (User ID: ${user.id})`);

      // 7. Reset bộ đếm lỗi (nếu có) [cite: 2861-2862]
      // await this.loginAttemptService.resetFailures(email); // Chỉ chạy nếu dùng LoginAttemptService

      // 8. Cập nhật lastLoginAt và mở khóa nếu cần [cite: 2863]
      // Dùng transaction nhỏ để đảm bảo cả hai cập nhật thành công
      await this.entityManager.transaction(async (txManager) => {
        if (!user) throw new InternalServerErrorException('User not found');
        await txManager.update(User, user.id, {
          lastLoginAt: new Date(),
          status: UserStatus.ACTIVE, // Đảm bảo status là active
          lockedUntil: undefined, // Xóa thời gian khóa tạm thời
        });
      });

      // 9. Tạo Access Token và Refresh Token
      const accessTokenPayload = { sub: user.id, role: user.role as string };
      const refreshTokenPayload = { sub: user.id }; // Refresh token chỉ chứa userId

      const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRES_IN',
          '15m',
        ) as any, // Dùng getOrThrow để đảm bảo secret tồn tại
      });

      const refreshToken = await this.jwtService.signAsync(
        refreshTokenPayload,
        {
          secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.get<string>(
            'REFRESH_TOKEN_EXPIRES_IN',
            '7d',
          ) as any,
        },
      );

      // 10. Hash Refresh Token và Lưu Session vào DB [cite: 2867-2869]
      const refreshTokenHash = await this.hashingService.hash(refreshToken);
      const refreshTokenExpiresIn = this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRES_IN',
        '7d',
      );
      if (!refreshTokenExpiresIn) {
        throw new Error('REFRESH_TOKEN_EXPIRES_IN is not defined');
      }
      const expiresAt = new Date(
        Date.now() + ms(refreshTokenExpiresIn as ms.StringValue),
      ); // Tính toán thời điểm hết hạn

      const session = this.entityManager.create(AuthSession, {
        userId: user.id,
        refreshTokenHash: refreshTokenHash, // Lưu hash
        roleAtLogin: user.role, // Lưu role lúc đăng nhập
        ip: ip,
        userAgent: userAgent,
        expiresAt: expiresAt, // Thời điểm hết hạn của RT
        // revokedAt: null (mặc định)
      });
      await this.entityManager.save(AuthSession, session); // Lưu session
      this.logger.log(`AuthSession created for user ${user.id}`);

      // 11. Ghi log audit thành công [cite: 2871]
      this.auditService.log({
        action: 'login.success',
        actorId: user.id,
        ip,
        userAgent,
        meta: { email },
      });

      // 12. Trả về kết quả cho Controller [cite: 2872-2878]
      return {
        accessToken,
        refreshToken, // Trả về refreshToken để Controller set cookie
        user: { id: user.id, fullName: user.fullName, role: user.role }, // Trả thông tin cơ bản của user
      };
    } catch (error) {
      // Bắt các lỗi đã throw (Unauthorized, Forbidden) và throw lại
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // Bắt các lỗi không mong muốn khác
      this.logger.error(
        `Unexpected error during login for ${email}:`,
        error.stack,
      );
      this.auditService.log({
        action: 'login.failed_unexpected',
        ip,
        userAgent,
        meta: { email: email, error: error.message },
      });
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình đăng nhập.',
      );
    }
  }

  /**
   * Refreshes the access token using a valid refresh token.
   * Implements Refresh Token Rotation and Replay Attack Detection.
   * @param userId - The user ID extracted from the refresh token payload.
   * @param oldRefreshToken - The original (plain text) refresh token string from the cookie.
   * @returns An object containing the new access token and new refresh token.
   * @throws UnauthorizedException if the refresh token is invalid, expired, revoked, or reused.
   * @throws InternalServerErrorException on unexpected errors.
   */
  async refreshTokens(
    userId: string,
    oldRefreshToken: string,
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    this.logger.log(`Attempting token refresh for user ID: ${userId}`);

    // 1. Hash the received old refresh token to compare with DB [cite: 3014-3015]
    const hashedOldToken = await this.hashingService.hash(oldRefreshToken);

    // 2. Find the corresponding session and mark it as revoked (atomic operation) [cite: 3016-3018]
    const revokedSession = await this.findAndRevokeSession(
      hashedOldToken,
      userId,
    );

    // 3. --- SECURITY: Replay Attack Detection ---
    // If findAndRevokeSession returned null, it means the token provided was:
    //    a) Invalid (never existed or wrong hash)
    //    b) Expired (expiresAt was in the past)
    //    c) Already Revoked (revokedAt was not NULL - THIS IS THE REUSE CASE)
    if (!revokedSession) {
      this.logger.warn(
        `Refresh token reuse or invalid token detected for user ID: ${userId}. Revoking all sessions.`,
      );
      // As a security measure, revoke ALL other valid sessions for this user.
      await this.revokeAllUserSessions(userId); // [cite: 3021-3022]
      // Log the critical security event
      this.auditService.log({
        action: 'token.refresh.reuse_or_invalid',
        actorId: userId,
      });
      // Throw Unauthorized to force re-login
      throw new UnauthorizedException(
        'Phiên làm việc không hợp lệ hoặc đã hết hạn.',
      ); //
    }

    // --- SUCCESSFUL ROTATION: oldRefreshToken was valid and is now revoked ---

    // 4. Get User Info (needed for new token payload, especially the current role) [cite: 3025-3026]
    // Use EntityManager or UserRepository here
    const user = await this.entityManager.findOne(User, {
      where: { id: userId, status: UserStatus.ACTIVE }, // Ensure user is still active
      select: ['id', 'role', 'fullName'], // Select only necessary fields
    });
    if (!user) {
      // Edge case: User might have been deactivated/deleted since the token was issued
      this.logger.error(
        `User ${userId} not found or inactive during token refresh.`,
      );
      this.auditService.log({
        action: 'token.refresh.failed_user_not_found',
        actorId: userId,
      });
      // Revoke all other sessions just in case
      await this.revokeAllUserSessions(userId);
      throw new UnauthorizedException('Người dùng không hợp lệ.');
    }

    // 5. Generate NEW Access Token and NEW Refresh Token
    const newAccessTokenPayload = { sub: user.id, role: user.role }; // Use current role from DB
    const newRefreshTokenPayload = { sub: user.id };

    const newAccessToken = await this.jwtService.signAsync(
      newAccessTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRES_IN',
          '15m',
        ) as any, // Dùng getOrThrow để đảm bảo secret tồn tại
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      newRefreshTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get<string>(
          'REFRESH_TOKEN_EXPIRES_IN',
          '7d',
        ) as any,
      },
    );

    // 6. Hash the NEW Refresh Token [cite: 3029]
    const newRefreshTokenHash = await this.hashingService.hash(newRefreshToken);

    // 7. Create and save the NEW AuthSession record [cite: 3030-3035]
    const newRefreshTokenExpiresIn = this.configService.getOrThrow<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );
    const newExpiresAt = new Date(
      Date.now() + ms(newRefreshTokenExpiresIn as ms.StringValue),
    );

    const newSession = this.entityManager.create(AuthSession, {
      userId: user.id,
      refreshTokenHash: newRefreshTokenHash,
      // Use the role recorded AT THE TIME OF ORIGINAL LOGIN from the revoked session
      // This prevents unexpected privilege escalation if the user's role was changed
      // after the session started, but before refresh.
      roleAtLogin: revokedSession.roleAtLogin,
      ip: revokedSession.ip, // Optionally update IP/UA from current request, or keep original
      userAgent: revokedSession.userAgent,
      expiresAt: newExpiresAt,
    });
    await this.entityManager.save(AuthSession, newSession);
    this.logger.log(
      `New AuthSession ${newSession.id} created for user ${user.id} during refresh.`,
    );

    // 8. Log successful refresh audit event
    this.auditService.log({
      action: 'token.refresh.success',
      actorId: user.id,
      meta: { oldSessionId: revokedSession.id, newSessionId: newSession.id },
    });

    // 9. Return the new tokens to the Controller [cite: 3038]
    return { newAccessToken, newRefreshToken };
  }

  /**
   * Revokes all active sessions for a specific user.
   * Used as a security measure when token reuse is detected.
   * @param userId - The ID of the user whose sessions should be revoked.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    this.logger.warn(`Revoking all active sessions for user ID: ${userId}`);
    try {
      const result = await this.entityManager.update(
        AuthSession,
        {
          userId: userId,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );
      this.logger.log(
        `Revoked ${result.affected} active sessions for user ID: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke sessions for user ${userId}:`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi khi thu hồi phiên làm việc.',
      );
    }
  }

  /**
   * Handles the user logout process by revoking the current session's refresh token.
   * @param refreshToken - The plain text refresh token string from the user's cookie.
   * @param userId - The ID of the user performing the logout (obtained from the access token).
   * @returns A success message.
   */
  async handleLogout(
    refreshToken: string | undefined,
    userId: string,
  ): Promise<{ message: string }> {
    this.logger.log(`Logout requested for user ID: ${userId}`);

    // 1. Kiểm tra refreshToken có tồn tại không [cite: 6947-6951]
    // Mặc dù endpoint yêu cầu login (có accessToken), cookie refreshToken có thể bị xóa thủ công
    if (!refreshToken) {
      this.logger.warn(
        `Logout attempt without refresh token cookie for user ID: ${userId}. Proceeding to log audit.`,
      );
      // Vẫn ghi log hành động logout dù không revoke được session cụ thể
      this.auditService.log({
        action: 'user.logout.no_token',
        actorId: userId,
      });
      // Trả về thành công vì mục đích là kết thúc phiên client-side
      return { message: 'Đăng xuất thành công.' };
    }

    try {
      // 2. Hash refresh token nhận được [cite: 6952]
      const hashedToken = await this.hashingService.hash(refreshToken);

      // 3. Gọi Repository/EntityManager để thu hồi session [cite: 6953-6954]
      // Tìm session khớp hash, user VÀ chưa bị revoke, sau đó cập nhật revoked_at
      const updateResult = await this.entityManager.update(
        AuthSession,
        {
          userId: userId, // Đảm bảo đúng user
          refreshTokenHash: hashedToken, // Khớp token hash
          revokedAt: IsNull(), // Chỉ revoke nếu chưa bị revoke
        },
        {
          revokedAt: new Date(), // Set thời điểm thu hồi
        },
      );

      if (updateResult.affected && updateResult.affected > 0) {
        this.logger.log(
          `Successfully revoked session via refresh token hash for user ID: ${userId}`,
        );
      } else {
        // Không tìm thấy session hợp lệ để revoke (có thể token sai, hoặc đã revoke trước đó)
        this.logger.warn(
          `No active session found matching the provided refresh token hash for user ID: ${userId}. Logout proceeds.`,
        );
        // Không cần throw lỗi ở đây, client vẫn nên xóa token của họ
      }

      // 4. Ghi log audit thành công (luôn ghi khi user gọi logout) [cite: 6958]
      this.auditService.log({ action: 'user.logout.success', actorId: userId });

      // 5. Luôn trả về thành công [cite: 6959-6961]
      return { message: 'Đăng xuất thành công.' };
    } catch (error) {
      // Bắt lỗi không mong muốn (ví dụ: lỗi DB)
      this.logger.error(
        `Error during logout for user ID ${userId}:`,
        error.stack,
      );
      this.auditService.log({
        action: 'user.logout.failed_unexpected',
        actorId: userId,
        meta: { error: error.message },
      });
      // Vẫn trả về thành công cho client để họ có thể xóa token local, nhưng server đã log lỗi
      // Hoặc có thể throw InternalServerErrorException nếu muốn báo lỗi rõ ràng
      // throw new InternalServerErrorException('Lỗi trong quá trình đăng xuất.');
      return { message: 'Đăng xuất thành công (có lỗi phía máy chủ).' }; // Hoặc thông báo chung
    }
  }

  async handleResetPassword(dto: ResetPasswordDto, ip: string): Promise<void> {
    const { email, otp, newPassword, confirmNewPassword } = dto;

    // THÊM: Validate confirm password
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Xác nhận mật khẩu mới không khớp.');
    }

    // 1. Tìm yêu cầu reset mới nhất chưa được sử dụng
    const request = await this.passwordResetRepo.findOne({
      where: {
        email,
        consumedAt: IsNull(), // [S2-DB-01] Chỉ lấy mã chưa dùng
      },
      order: { createdAt: 'DESC' },
    });

    // 2. [XÁC THỰC] Kiểm tra tồn tại và thời hạn (15 phút)
    if (!request) {
      throw new BadRequestException('Yêu cầu đặt lại mật khẩu không tồn tại.');
    }

    if (request.expiresAt < new Date()) {
      throw new BadRequestException('Mã xác thực đã hết hạn.');
    }

    // 3. [BẢO MẬT] So khớp mã OTP đã hash (Sử dụng HashingService S1)
    const isOtpValid = await this.hashingService.compare(otp, request.codeHash);
    if (!isOtpValid) {
      throw new BadRequestException('Mã xác thực không chính xác.');
    }

    // 4. [BẢO MẬT] Hash mật khẩu mới
    const newHashedPassword = await this.hashingService.hash(newPassword);

    // 5. [TRANSACTION] Thực thi cập nhật đa bảng
    await this.dataSource.transaction(async (manager) => {
      // A. Cập nhật password mới (Bảng Credentials S1)
      await manager.update(
        UserCredential,
        { userId: request.userId },
        { passwordHash: newHashedPassword, passwordUpdatedAt: new Date() },
      );

      // B. Đánh dấu mã OTP đã được tiêu thụ
      await manager.update(
        PasswordResetRequest,
        { id: request.id },
        { consumedAt: new Date() },
      );

      // C. [QUAN TRỌNG - UC03.4] Thu hồi toàn bộ phiên đăng nhập (Bảng Sessions S1)
      // Việc này giúp "out" người dùng khỏi tất cả trình duyệt/thiết bị khác
      await manager.update(
        AuthSession,
        { userId: request.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });

    // [Task: S2-BE-07] Ghi log hành động đặt lại mật khẩu THÀNH CÔNG
    await this.auditService.log({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      actorId: request.userId,
      ip: ip,
      details: {
        email: email,
        message:
          'Mật khẩu đã được thay đổi và các phiên đăng nhập cũ bị thu hồi',
      },
    });
  }
}
