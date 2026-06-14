// src/modules/announcement/announcement.service.ts
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Announcement, Course, Purchase } from '@prisma/client'; // nếu có prisma client

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getByTeacher(teacherId: string) {
    return this.prisma.announcement.findMany({
      where: { teacherId },
      include: {
        course: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    teacherId: string,
    courseId: string,
    title: string,
    content: string,
  ) {
    // Kiểm tra quyền sở hữu khoá học
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: teacherId },
    });
    if (!course) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    }

    // Tạo announcement
    const announcement = await this.prisma.announcement.create({
      data: { teacherId, courseId, title, content },
    });

    // Gửi thông báo (chạy ngầm – fire and forget)
    this.sendNotificationsToStudents(courseId, title, content).catch((err) => {
      this.logger.error(`Lỗi gửi notification cho khoá học ${courseId}:`, err);
    });

    return announcement;
  }

  private async sendNotificationsToStudents(
    courseId: string,
    title: string,
    content: string,
  ) {
    // Lấy danh sách học viên đã mua khoá học thành công
    const purchases = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      select: { userId: true },
    });

    if (!purchases.length) return;

    const safeDescription = content?.slice(0, 200) ?? '';
    const notificationData = purchases.map((purchase) => ({
      userId: purchase.userId,
      title: `Thông báo từ khóa học: ${title}`,
      description: safeDescription,
      link: `/courses/${courseId}`,
    }));

    await this.prisma.notification.createMany({
      data: notificationData,
    });
  }
}
