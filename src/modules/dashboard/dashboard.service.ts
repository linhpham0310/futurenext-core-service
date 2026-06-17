import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '../users/entities/user.entity';
import { TeacherProfile } from '../users/entities/teacher-profile.entity';
import { SecurityAuditLog } from '../../shared/providers/audit/audit.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(TeacherProfile)
    private teacherProfileRepo: Repository<TeacherProfile>,
    @InjectRepository(SecurityAuditLog)
    private auditLogRepo: Repository<SecurityAuditLog>,
  ) {}

  async getAdminStats() {
    const totalUsers = await this.userRepo.count();
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

    const pendingTeacherProfiles = await this.teacherProfileRepo.count({
      where: { status: 'pending_review' as any },
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
    const logs = await this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.action,
      description: log.meta?.details || log.action,
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
      this.prisma.lxLearningProgress.count({
        where: { userId, status: 'COMPLETED' },
      }),
      this.prisma.lxLearningProgress.count({ where: { userId } }),
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
      take: limit,
    });

    return purchases.map((p) => ({
      id: p.course.id,
      title: p.course.title,
      progress: 0,
      lastAccessedAt: p.purchasedAt,
    }));
  }
}
