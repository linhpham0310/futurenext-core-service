import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../../notifications/services/email.service';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class AuthListener {
  private readonly logger = new Logger(AuthListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: { user: User; otp: string }) {
    this.logger.log(`Handling user.registered event for ${payload.user.email}`);
    try {
      await this.emailService.sendVerificationEmail(payload.user, payload.otp);
      this.logger.log(`Verification email sent to ${payload.user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${payload.user.email}:`,
        error,
      );
    }
  }

  @OnEvent('auth.password_reset_requested')
  async handlePasswordReset(payload: {
    email: string;
    fullName: string;
    otp: string;
  }) {
    this.logger.log(`Handling password reset request for ${payload.email}`);
    try {
      this.logger.log(`Password reset OTP sent to ${payload.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${payload.email}:`,
        error,
      );
    }
  }
}
