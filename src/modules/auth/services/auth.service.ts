// src/modules/auth/services/auth.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
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
  ) {}

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
}
