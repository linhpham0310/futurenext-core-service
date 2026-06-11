import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchForTeacher(teacherId: string, query: string) {
    const courses = await this.prisma.course.findMany({
      where: {
        instructorId: teacherId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, thumbnailUrl: true },
    });
    const students = await this.prisma.purchase.findMany({
      where: {
        course: { instructorId: teacherId },
        user: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      distinct: ['userId'],
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    const results = [
      ...courses.map((c) => ({
        id: c.id,
        label: c.title,
        type: 'course',
        link: `/teacher/courses/${c.id}`,
      })),
      ...students.map((s) => ({
        id: s.user.id,
        label: s.user.fullName,
        type: 'user',
        link: `/teacher/students/${s.user.id}`,
      })),
    ];
    return results;
  }
}
