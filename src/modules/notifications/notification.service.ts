import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

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

  async createNotification(
    userId: string,
    title: string,
    description: string,
    link?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, description, link, isRead: false },
    });
  }

  async sendNotificationToTeacherOnEnroll(
    teacherId: string,
    courseTitle: string,
    courseId: string,
  ) {
    return this.createNotification(
      teacherId,
      'Học viên mới đăng ký',
      `Một học viên vừa đăng ký khóa học "${courseTitle}"`,
      `/teacher/courses/${courseId}/students`,
    );
  }
}
