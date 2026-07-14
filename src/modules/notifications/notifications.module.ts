import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import {
  NotificationController,
  TeacherNotificationController,
} from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './services/email.service';
import { UserRegisteredListener } from './listeners/user-registered.listener';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PrismaModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>('SMTP_HOST');
        const port = configService.getOrThrow<number>('SMTP_PORT');
        const user = configService.getOrThrow<string>('SMTP_USER');
        const pass = configService.getOrThrow<string>('SMTP_PASS');
        const secure =
          configService.get<string>('EMAIL_SECURE', 'false').toLowerCase() ===
          'true';
        const from = configService.getOrThrow<string>('SMTP_FROM');

        Logger.log(
          `[MailerModule Init] Config: Host=${host}, Port=${port}, User=${user ? '******' : 'N/A'}, Secure=${secure}, From=${from}`,
          'MailerModule',
        );

        return {
          transport: {
            host,
            port,
            secure,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
          },
          defaults: { from },
        };
      },
    }),
  ],
  controllers: [NotificationController, TeacherNotificationController],
  providers: [
    NotificationService,
    EmailService,
    UserRegisteredListener,
    Logger,
  ],
  exports: [NotificationService, EmailService],
})
export class NotificationsModule {}
