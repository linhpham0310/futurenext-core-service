// src/modules/announcement/announcement.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  async getByTeacher(teacherId: string) {
    return this.prisma.announcement.findMany({
      where: { teacherId },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    teacherId: string,
    courseId: string,
    title: string,
    content: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: teacherId },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    const announcement = await this.prisma.announcement.create({
      data: { teacherId, courseId, title, content },
    });
    // Gửi thông báo cho tất cả học viên đã mua khóa học (tuỳ chọn)
    const purchases = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      select: { userId: true },
    });
    await Promise.all(
      purchases.map((p) =>
        this.prisma.notification.create({
          data: {
            userId: p.userId,
            title: `Thông báo từ khóa học: ${title}`,
            description: content.substring(0, 200),
            link: `/courses/${courseId}`,
          },
        }),
      ),
    );
    return announcement;
  }
}
