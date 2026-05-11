// src/db/seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { HashingService } from '@/shared/providers/hashing/hashing.service'; // Import HashingService chuẩn
import {
  User,
  UserRole,
  UserStatus,
} from '@/modules/users/entities/user.entity';
import { UserCredential } from '@/modules/users/entities/user-credential.entity';
import { UserConsent } from '@/modules/users/entities/user-consent.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeedService {
  // Sử dụng Logger của NestJS để ghi log quá trình seeding
  private readonly logger = new Logger(SeedService.name);

  constructor(
    // Inject EntityManager để thực hiện các thao tác DB trong transaction
    @InjectEntityManager() private readonly entityManager: EntityManager,
    // Inject HashingService để hash mật khẩu an toàn
    private readonly hashingService: HashingService,
    // Inject ConfigService để đọc phiên bản consent từ .env
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hàm chính thực thi toàn bộ quá trình seeding.
   */
  async seed(): Promise<void> {
    this.logger.log('🚀 Starting database seeding process...');

    try {
      // Chạy các hàm seeding phụ trợ theo thứ tự logic (nếu có phụ thuộc)
      await this.seedUsersAndCredentials();
      // await this.seedOtherData(); // Ví dụ: seed roles, permissions... nếu có

      this.logger.log('✅ Database seeding finished successfully.');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error.stack);
      // Ném lỗi ra ngoài để script run-seed.ts biết và thoát với mã lỗi
      throw error;
    }
  }

  /**
   * Seed dữ liệu cho bảng Users, UserCredentials và UserConsents.
   */
  private async seedUsersAndCredentials(): Promise<void> {
    this.logger.log('Seeding Users, Credentials, and Consents...');

    const studentPasswordPlain = 'password123'; // Mật khẩu gốc
    const adminPasswordPlain = 'admin123'; // Mật khẩu gốc

    // Hash mật khẩu an toàn bằng HashingService của project
    const studentHash = await this.hashingService.hash(studentPasswordPlain);
    const adminHash = await this.hashingService.hash(adminPasswordPlain);
    const currentConsentVersion = this.configService.get<string>(
      'CURRENT_CONSENT_VERSION',
      'unknown',
    );

    // Sử dụng transaction để đảm bảo tất cả thao tác thành công hoặc không gì cả
    await this.entityManager.transaction(async (transactionalEntityManager) => {
      this.logger.log('Running inside transaction...');

      // --- Seed Student User ---
      const studentEmail = 'student@test.com';
      let student = await transactionalEntityManager.findOne(User, {
        where: { email: studentEmail },
      });
      if (!student) {
        student = transactionalEntityManager.create(User, {
          // Cung cấp UUID tường minh nếu cần test với ID cố định
          // id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          fullName: 'Student Tester',
          email: studentEmail,
          role: UserRole.STUDENT,
          status: UserStatus.PENDING_EMAIL_VERIFY, // Bắt đầu ở trạng thái chờ xác minh
          locale: 'en-US', // Ví dụ locale khác
        });
        await transactionalEntityManager.save(student);
        this.logger.log(`Created user: ${student.email} (ID: ${student.id})`);

        const studentCred = transactionalEntityManager.create(UserCredential, {
          userId: student.id,
          passwordHash: studentHash,
          passwordUpdatedAt: new Date(), // Set thời gian cập nhật PW
        });
        await transactionalEntityManager.save(studentCred);
        this.logger.log(`Created credentials for: ${student.email}`);

        // (Optional) Seed consent cho student nếu cần
        // const studentConsent = transactionalEntityManager.create(UserConsent, { ... });
        // await transactionalEntityManager.save(studentConsent);
      } else {
        this.logger.warn(
          `User already exists: ${student.email}, skipping creation.`,
        );
      }

      // --- Seed Admin User ---
      const adminEmail = 'admin@test.com';
      let admin = await transactionalEntityManager.findOne(User, {
        where: { email: adminEmail },
      });
      if (!admin) {
        admin = transactionalEntityManager.create(User, {
          // id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          fullName: 'Admin Tester',
          email: adminEmail,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE, // Admin được active sẵn
        });
        await transactionalEntityManager.save(admin);
        this.logger.log(`Created user: ${admin.email} (ID: ${admin.id})`);

        const adminCred = transactionalEntityManager.create(UserCredential, {
          userId: admin.id,
          passwordHash: adminHash,
          passwordUpdatedAt: new Date(),
        });
        await transactionalEntityManager.save(adminCred);
        this.logger.log(`Created credentials for: ${admin.email}`);

        // Seed consent cho admin (quan trọng để admin có thể đăng nhập nếu có check consent)
        const adminConsent = transactionalEntityManager.create(UserConsent, {
          userId: admin.id,
          consentVersion: currentConsentVersion,
          consentTimestamp: new Date(),
          ipAddress: '127.0.0.1', // IP giả lập cho seed
          userAgent: 'SeedScript/1.0', // UA giả lập
        });
        await transactionalEntityManager.save(adminConsent);
        this.logger.log(
          `Created consent (v${currentConsentVersion}) for: ${admin.email}`,
        );
      } else {
        this.logger.warn(
          `User already exists: ${admin.email}, skipping creation.`,
        );
        // Kiểm tra và seed consent nếu admin đã tồn tại nhưng chưa có consent version hiện tại
        const existingConsent = await transactionalEntityManager.findOne(
          UserConsent,
          {
            where: { userId: admin.id, consentVersion: currentConsentVersion },
          },
        );
        if (!existingConsent) {
          const adminConsent = transactionalEntityManager.create(UserConsent, {
            userId: admin.id,
            consentVersion: currentConsentVersion,
            consentTimestamp: new Date(),
            ipAddress: '127.0.0.1',
            userAgent: 'SeedScript/1.0',
          });
          await transactionalEntityManager.save(adminConsent);
          this.logger.log(
            `Created consent (v${currentConsentVersion}) for existing admin: ${admin.email}`,
          );
        } else {
          this.logger.log(
            `Consent (v${currentConsentVersion}) already exists for admin: ${admin.email}`,
          );
        }
      }
    }); // Kết thúc transaction
    this.logger.log('Finished seeding Users, Credentials, and Consents.');
  }

  // private async seedOtherData(): Promise<void> {
  //   this.logger.log('Seeding other data...');
  //   // Thêm logic seed cho các bảng khác ở đây nếu cần
  //   this.logger.log('Finished seeding other data.');
  // }
}
