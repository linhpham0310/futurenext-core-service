import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(user: User, otp: string): Promise<void> {
    const subject = `[FutureNext] Mã kích hoạt tài khoản của bạn`;
    const fromAddress = this.configService.get<string>('SMTP_FROM');

    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
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

    this.logger.log(`Attempting to send verification email to ${user.email}`);
    try {
      const result = await this.mailerService.sendMail({
        to: user.email,
        from: fromAddress,
        subject,
        html: htmlContent,
      });
      this.logger.log(
        `Verification email sent to ${user.email}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}:`,
        error.stack,
      );
      throw error;
    }
  }

  async sendPasswordResetEmail(user: User, otp: string): Promise<void> {
    const subject = `[FutureNext] Yêu cầu đặt lại mật khẩu của bạn`;
    const fromAddress = this.configService.get<string>('SMTP_FROM');

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

    this.logger.log(`Attempting to send password reset email to ${user.email}`);
    try {
      const result = await this.mailerService.sendMail({
        to: user.email,
        from: fromAddress,
        subject,
        html: htmlContent,
      });
      this.logger.log(
        `Password reset email sent to ${user.email}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}:`,
        error.stack,
      );
      throw error;
    }
  }

  async sendGenericNotificationEmail(
    toEmail: string,
    title: string,
    content: string,
  ): Promise<void> {
    const subject = `[FutureNext] ${title}`;
    const fromAddress = this.configService.get<string>('SMTP_FROM');

    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
           <h1 style="color: #0d6efd; margin: 0; font-size: 24px;">FutureNext.ai</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">${title}</h2>
          <p>${content}</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.85em; color: #6c757d;">
          &copy; ${new Date().getFullYear()} FutureNext.ai. All rights reserved.
        </div>
      </div>
    `;

    this.logger.log(`Attempting to send notification email to ${toEmail}`);
    try {
      const result = await this.mailerService.sendMail({
        to: toEmail,
        from: fromAddress,
        subject,
        html: htmlContent,
      });
      this.logger.log(
        `Notification email sent to ${toEmail}. Message ID: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification email to ${toEmail}:`,
        error.stack,
      );
      throw error;
    }
  }
}
