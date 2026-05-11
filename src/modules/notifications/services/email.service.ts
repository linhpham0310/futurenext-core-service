/**
 * @file Service responsible for sending application emails (verification, password reset, etc.).
 * Uses the configured MailerService from @nestjs-modules/mailer.
 */
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer'; // Inject MailerService
import { User } from '@/modules/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService, // Injected MailerService instance
    private readonly configService: ConfigService, // To get default FROM address if needed
  ) {}

  /**
   * Sends the email verification email containing the OTP via the configured SMTP transport.
   * @param user - The recipient user object containing name and email.
   * @param otp - The plain text OTP code (6 digits).
   * @throws Error if email sending fails via MailerService, allowing the listener to handle it.
   */
  async sendVerificationEmail(user: User, otp: string): Promise<void> {
    const subject = `[FutureNext] Mã kích hoạt tài khoản của bạn`;
    const fromAddress = this.configService.get<string>('EMAIL_FROM');

    // Basic, clean HTML template for verification
    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
           {/* TODO: Add Logo here */}
           <h1 style="color: #0d6efd; margin: 0; font-size: 24px;">FutureNext.ai</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Xác thực địa chỉ email của bạn</h2>
          <p>Chào ${user.fullName || 'bạn'},</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại FutureNext.ai! Để hoàn tất, vui lòng sử dụng mã xác thực dùng một lần dưới đây:</p>
          <div style="background-color: #e9ecef; padding: 15px 20px; text-align: center; margin: 25px 0; border-radius: 5px;">
            <strong style="font-size: 28px; letter-spacing: 5px; color: #0d6efd; display: block;">${otp}</strong>
          </div>
          <p>Mã này sẽ hết hạn sau <strong>24 giờ</strong>.</p>
          <p>Nếu bạn không thực hiện yêu cầu đăng ký này, bạn có thể bỏ qua email này.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.85em; color: #6c757d;">
          &copy; ${new Date().getFullYear()} FutureNext.ai. All rights reserved.
        </div>
      </div>
    `;

    this.logger.log(
      `Attempting to send verification email via MailerService to ${user.email}`,
    );
    try {
      // Send mail using the configured transport
      const result = await this.mailerService.sendMail({
        to: user.email,
        from: fromAddress, // Optional if default is set in module config
        subject: subject,
        html: htmlContent,
      });
      this.logger.log(
        `Verification email successfully sent to ${user.email}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email} via MailerService:`,
        error.stack,
      );
      // Re-throw for the listener to catch and perform failed audit logging
      throw error;
    }
  }

  /**
   * Sends the password reset email containing the OTP via the configured SMTP transport.
   * @param user - The recipient user object.
   * @param otp - The plain text OTP code (6 digits).
   * @throws Error if email sending fails via MailerService.
   */
  async sendPasswordResetEmail(user: User, otp: string): Promise<void> {
    const subject = `[FutureNext] Yêu cầu đặt lại mật khẩu của bạn`;
    const fromAddress = this.configService.get<string>('EMAIL_FROM');

    // Basic HTML template for password reset
    const htmlContent = `
     <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
           <h1 style="color: #0d6efd; margin: 0; font-size: 24px;">FutureNext.ai</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Đặt lại mật khẩu</h2>
          <p>Chào ${user.fullName || 'bạn'},</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản FutureNext.ai của bạn. Sử dụng mã OTP dưới đây:</p>
          <div style="background-color: #e9ecef; padding: 15px 20px; text-align: center; margin: 25px 0; border-radius: 5px;">
            <strong style="font-size: 28px; letter-spacing: 5px; color: #0d6efd; display: block;">${otp}</strong>
          </div>
          <p>Mã này sẽ hết hạn sau <strong>15 phút</strong>.</p>
          <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email hoặc liên hệ hỗ trợ nếu bạn lo ngại về bảo mật tài khoản.</p>
        </div>
         <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.85em; color: #6c757d;">
          &copy; ${new Date().getFullYear()} FutureNext.ai. All rights reserved.
        </div>
      </div>
    `;

    this.logger.log(
      `Attempting to send password reset email via MailerService to ${user.email}`,
    );
    try {
      const result = await this.mailerService.sendMail({
        to: user.email,
        from: fromAddress,
        subject: subject,
        html: htmlContent,
      });
      this.logger.log(
        `Password reset email successfully sent to ${user.email}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email} via MailerService:`,
        error.stack,
      );
      throw error; // Re-throw for listener
    }
  }
}
