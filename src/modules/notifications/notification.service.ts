import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationChannelType,
} from './dto/create-notification.dto';
import { EmailService } from './services/email.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getUserNotifications(userId: string, limit: number = 20) {
    const take = Number(limit) || 20;

    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        link: dto.link,
        isRead: dto.isRead || false,
      },
    });

    if (dto.type === NotificationChannelType.EMAIL) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: { email: true },
        });
        if (user?.email) {
          await this.emailService.sendGenericNotificationEmail(
            user.email,
            dto.title,
            dto.description,
          );
        } else {
          this.logger.warn(
            `Không tìm thấy email cho userId ${dto.userId}, bỏ qua gửi email thông báo`,
          );
        }
      } catch (error) {
        // Không throw - notification đã lưu DB thành công,
        // lỗi gửi email không nên làm fail response
        this.logger.error(
          `Gửi email thông báo thất bại cho userId ${dto.userId}:`,
          error.stack,
        );
      }
    }

    return notification;
  }

  async sendNotificationToTeacherOnEnroll(
    teacherId: string,
    courseTitle: string,
    courseId: string,
  ) {
    return this.createNotification({
      userId: teacherId,
      title: 'Học viên mới đăng ký',
      description: `Một học viên vừa đăng ký khóa học "${courseTitle}"`,
      link: `/teacher/courses/${courseId}/students`,
    });
  }

  async getAll(limit: number = 50) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createForAudience(dto: any) {
    const { title, content, type, audience, targetUserIds } = dto;
    let userIds: string[] = [];

    if (audience === 'ALL') {
      const users = await this.prisma.user.findMany({
        select: { id: true },
        where: { status: 'active' },
      });
      userIds = users.map((u) => u.id);
    } else if (audience === 'STUDENTS') {
      const users = await this.prisma.user.findMany({
        where: { role: 'student', status: 'active' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (audience === 'TEACHERS') {
      const users = await this.prisma.user.findMany({
        where: { role: 'teacher', status: 'active' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (audience === 'ADMINS') {
      const users = await this.prisma.user.findMany({
        where: { role: 'admin', status: 'active' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (audience === 'SPECIFIC' && targetUserIds) {
      userIds = targetUserIds;
    }

    if (userIds.length === 0) {
      return {
        success: false,
        message: 'Không có người dùng nào nhận thông báo',
      };
    }

    const data = userIds.map((userId) => ({
      userId,
      title,
      description: content,
      link: '/notifications',
    }));

    await this.prisma.notification.createMany({ data });

    if (type === 'EMAIL') {
      this.logger.log(
        `Sending ${data.length} emails for notification: ${title}`,
      );
    }

    return { success: true, count: data.length };
  }
}
