import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../users/entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  // Admin dashboard stats
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/stats')
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
    // Tính growth tạm thời = 0 (có thể cải thiện sau)
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

  // Admin recent activities
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/activities/recent')
  async getRecentActivities(@Query('limit') limit = 10) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map((log) => ({
      id: log.id,
      type: log.action,
      description: log.details,
      timestamp: log.createdAt,
    }));
  }

  // Teacher dashboard stats
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get('teacher/stats')
  async getTeacherStats(@Request() req) {
    const teacherId = req.user.sub;
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
}
