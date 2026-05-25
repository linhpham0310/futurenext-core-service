// src/modules/notifications/notifications.module.ts
/**
 * @file Module for handling notifications, primarily email sending via MailerModule.
 */
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './services/email.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';
//  AuthListener nên ở trong AuthModule, không nên import ở đây
// import { AuthListener } from '../auth/listeners/auth.listener';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Read required SMTP settings from environment variables/secrets
        const host = configService.getOrThrow<string>('SMTP_HOST');
        const port = configService.getOrThrow<number>('SMTP_PORT');
        const user = configService.getOrThrow<string>('SMTP_USER');
        const pass = configService.getOrThrow<string>('SMTP_PASS');
        const secure =
          configService.get<string>('EMAIL_SECURE', 'false').toLowerCase() ===
          'true';
        const from = configService.getOrThrow<string>('SMTP_FROM');

        // Log configuration on startup (mask password for security)
        Logger.log(
          `[MailerModule Init] Config: Host=${host}, Port=${port}, User=${user ? '******' : 'N/A'}, Secure=${secure}, From=${from}`,
          'MailerModule',
        );

        return {
          transport: {
            host: host,
            port: port,
            secure: secure,
            auth: {
              user: user,
              pass: pass,
            },
          },
          defaults: {
            from: from,
          },
        };
      },
    }),
  ],
  providers: [
    EmailService,
    UserRegisteredListener,
    Logger,
    //  Không có AuthListener ở đây
  ],
  exports: [EmailService],
})
export class NotificationsModule {}
