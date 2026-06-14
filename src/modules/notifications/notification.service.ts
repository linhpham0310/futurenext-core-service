import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        description: dto.description,
        link: dto.link,
        isRead: dto.isRead || false,
      },
    });
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
}
