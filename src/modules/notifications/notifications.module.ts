/**
 * @file Module for handling notifications, primarily email sending via MailerModule.
 */
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './services/email.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Read required SMTP settings from environment variables/secrets
        const host = configService.getOrThrow<string>('SMTP_HOST');
        const port = configService.getOrThrow<number>('SMTP_PORT'); // Assume it's a number in .env or parsed
        const user = configService.getOrThrow<string>('SMTP_USER');
        const pass = configService.getOrThrow<string>('SMTP_PASS'); // Sensitive - should come from Secret Manager in prod/staging
        const secure =
          configService.get<string>('EMAIL_SECURE', 'false').toLowerCase() ===
          'true';
        const from = configService.getOrThrow<string>('EMAIL_FROM');

        // Log configuration on startup (mask password for security)
        console.log(
          `[MailerModule Init] Config: Host=${host}, Port=${port}, User=${user ? '******' : 'N/A'}, Secure=${secure}, From=${from}`,
        );

        return {
          transport: {
            // Nodemailer transport options
            host: host,
            port: port,
            secure: secure, // if true, uses SSL (port 465), if false uses STARTTLS (ports 587, 2525)
            auth: {
              user: user,
              pass: pass,
            },
          },
          defaults: {
            // Default options for all emails
            from: from,
          },
          // Optional: template engine setup
          // template: { ... }
        };
      },
    }),
  ],
  providers: [EmailService, UserRegisteredListener, Logger],
  exports: [EmailService],
})
export class NotificationsModule {}
