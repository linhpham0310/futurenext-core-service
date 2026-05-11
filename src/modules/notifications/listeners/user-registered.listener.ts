/**
 * @file Listener for the 'user.registered' event.
 * Triggers sending the verification email and logs the outcome.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AuditService,
  AuditLogPayload,
} from '@/shared/providers/audit/audit.service'; // Import AuditService
import { EmailService } from '../services/email.service'; // Import EmailService
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly auditService: AuditService, // Inject AuditService
  ) {}

  /**
   * Handles the 'user.registered' event asynchronously.
   * @param payload - Contains the newly registered user and the plain OTP.
   */
  @OnEvent('user.registered', { async: true }) // async: true để chạy bất đồng bộ, không block AuthService
  async handleUserRegisteredEvent(payload: {
    user: User;
    otp: string;
  }): Promise<void> {
    this.logger.log(
      `Received 'user.registered' event for: ${payload.user.email}`,
    );
    let auditAction: string;
    const auditMeta: Record<string, any> = {
      email: payload.user.email,
      userId: payload.user.id,
    };

    try {
      // Gọi EmailService để gửi email
      await this.emailService.sendVerificationEmail(payload.user, payload.otp);
      this.logger.log(
        `Verification email ostensibly sent to: ${payload.user.email}`,
      );
      // Ghi log audit thành công (BR-Audit email sent) [cite: 2031, 2053]
      auditAction = 'email.verification.sent';
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${payload.user.email}:`,
        error.stack,
      );
      // Ghi log audit thất bại [cite: 2031, 2056]
      auditAction = 'email.verification.failed';
      auditMeta.error = error.message; // Thêm chi tiết lỗi vào meta
    }

    // Ghi log audit (thành công hoặc thất bại)
    const auditPayload: AuditLogPayload = {
      action: auditAction,
      actorId: payload.user.id, // User vừa đăng ký là actor của event này
      meta: auditMeta,
      // Không cần IP/UA ở đây vì log này ghi nhận kết quả của hành động server-side
    };
    this.auditService.log(auditPayload);
  }
}
