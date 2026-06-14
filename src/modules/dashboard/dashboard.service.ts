// src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const totalUsers = await this.prisma.user.count();
    const totalCourses = await this.prisma.course.count();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyRevenue =
      (
        await this.prisma.purchase.aggregate({
          _sum: { amount: true },
          where: { purchasedAt: { gte: startOfMonth }, status: 'COMPLETED' },
        })
      )._sum.amount || 0;

    const pendingCourses = await this.prisma.course.count({
      where: { status: 'SUBMITTED' },
    });

    const pendingTeacherProfiles = await this.prisma.teacherProfile.count({
      where: { status: 'PENDING_REVIEW' },
    });

    return {
      totalUsers,
      totalCourses,
      monthlyRevenue,
      pendingCourses,
      pendingTeacherProfiles,
      userGrowthPercent: 0,
      revenueGrowthPercent: 0,
    };
  }

  async getRecentActivities(limit: number = 10) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.action,
      description: log.details,
      timestamp: log.createdAt,
    }));
  }

  async getTeacherStats(teacherId: string) {
    const totalCourses = await this.prisma.course.count({
      where: { instructorId: teacherId },
    });

    const totalStudents = await this.prisma.purchase.count({
      where: { course: { instructorId: teacherId }, status: 'COMPLETED' },
      distinct: ['userId'],
    });

    const totalRevenue =
      (
        await this.prisma.purchase.aggregate({
          _sum: { amount: true },
          where: { course: { instructorId: teacherId }, status: 'COMPLETED' },
        })
      )._sum.amount || 0;

    const totalCertificates = await this.prisma.certificate.count({
      where: { course: { instructorId: teacherId } },
    });

    return { totalCourses, totalStudents, totalRevenue, totalCertificates };
  }

  async getStudentStats(userId: string) {
    const [
      totalEnrolled,
      completedLessons,
      totalLessons,
      totalCertificates,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.purchase.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.learningProgress.count({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.learningProgress.count({ where: { userId } }),
      this.prisma.certificate.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      totalEnrolledCourses: totalEnrolled,
      completedLessons,
      totalLessons,
      totalCertificates,
      unreadNotifications,
      pendingExams: 0,
    };
  }

  async getStudentRecentCourses(userId: string, limit: number = 3) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { purchasedAt: 'desc' },
      take: Number(limit),
    });

    return purchases.map((p) => ({
      id: p.course.id,
      title: p.course.title,
      progress: 0,
      lastAccessedAt: p.purchasedAt,
    }));
  }
}
