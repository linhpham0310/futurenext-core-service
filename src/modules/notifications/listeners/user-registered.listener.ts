import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AuditService,
  AuditLogPayload,
} from '../../../shared/providers/audit/audit.service';
import { EmailService } from '../services/email.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  @OnEvent('user.registered', { async: true })
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
      await this.emailService.sendVerificationEmail(payload.user, payload.otp);
      this.logger.log(`Verification email sent to: ${payload.user.email}`);
      auditAction = 'email.verification.sent';
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${payload.user.email}:`,
        error.stack,
      );
      auditAction = 'email.verification.failed';
      auditMeta.error = error.message;
    }

    const auditPayload: AuditLogPayload = {
      action: auditAction,
      actorId: payload.user.id,
      meta: auditMeta,
    };
    this.auditService.log(auditPayload);
  }
}
