import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalCourses,
      monthlyRevenue,
      pendingCourses,
      pendingTeacherProfiles,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.prisma.purchase.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          status: 'SUCCESS',
        },
        _sum: { amount: true },
      }),
      this.prisma.course.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.teacherProfile.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);

    // Tính growth (giả sử so với tháng trước)
    const lastMonthRevenue = await this.prisma.purchase.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });
    const revenueGrowthPercent = lastMonthRevenue._sum.amount
      ? (((monthlyRevenue._sum.amount || 0) -
          (lastMonthRevenue._sum.amount || 0)) /
          (lastMonthRevenue._sum.amount || 1)) *
        100
      : 0;

    const userGrowthPercent = 0; // Có thể tính thêm

    return {
      totalUsers,
      totalCourses,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      pendingCourses,
      pendingTeacherProfiles,
      userGrowthPercent,
      revenueGrowthPercent,
    };
  }

  async getRecentActivities(limit: number) {
    // Lấy từ bảng audit logs hoặc event logs, tạm thời trả về mảng rỗng
    // Bạn có thể implement bằng cách lấy từ bảng `Activity` nếu có
    return [];
  }

  async getAllUsers(query: any) {
    const { q, role, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserStatus(userId: string, status: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: { id: true, status: true },
    });
  }

  async getAllCourses(query: any) {
    const { q, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { fullName: true, email: true } },
          _count: { select: { students: true, sections: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    // Format lại để có instructor name, students count, revenue (tính từ purchases)
    const itemsWithRevenue = await Promise.all(
      items.map(async (course) => {
        const revenue = await this.prisma.purchase.aggregate({
          where: { courseId: course.id, status: 'SUCCESS' },
          _sum: { amount: true },
        });
        return {
          ...course,
          instructor: course.instructor.fullName,
          students: course._count.students,
          revenue: revenue._sum.amount || 0,
        };
      }),
    );

    return { data: itemsWithRevenue, totalPages: Math.ceil(total / limit) };
  }

  async getCourseDetail(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { fullName: true, email: true } },
        sections: { include: { lessons: true } },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }

  async approveCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.status !== 'SUBMITTED') {
      throw new BadRequestException('Khóa học không ở trạng thái chờ duyệt');
    }
    return this.prisma.course.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async rejectCourse(id: string, reason: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.status !== 'SUBMITTED') {
      throw new BadRequestException('Khóa học không ở trạng thái chờ duyệt');
    }
    // Lưu lý do vào review log (nếu có bảng course_review_logs)
    await this.prisma.courseReviewLog.create({
      data: {
        courseId: id,
        adminId: 'admin-id', // cần lấy từ token, tạm để
        action: 'REJECTED',
        reason: reason || 'Không có lý do',
      },
    });
    return this.prisma.course.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  async deleteCourse(id: string) {
    // Kiểm tra tồn tại
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    // Xóa cascade (Prisma sẽ tự xóa sections, lessons nếu có onDelete: Cascade)
    return this.prisma.course.delete({ where: { id } });
  }

  async getAllStudents(query: any) {
    const { q, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: any = { role: 'STUDENT' };
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          purchases: {
            where: { status: 'SUCCESS' },
            select: { courseId: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const studentsWithCount = items.map((student) => ({
      ...student,
      coursesEnrolled: student.purchases.length,
      joinedAt: student.createdAt,
    }));

    return { data: studentsWithCount, totalPages: Math.ceil(total / limit) };
  }

  async getStudentDetail(id: string) {
    const student = await this.prisma.user.findFirst({
      where: { id, role: 'STUDENT' },
      include: {
        purchases: {
          where: { status: 'SUCCESS' },
          include: { course: true },
        },
      },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học viên');
    return {
      ...student,
      coursesEnrolled: student.purchases.length,
    };
  }

  async updateStudent(id: string, data: any) {
    return this.prisma.user.update({
      where: { id, role: 'STUDENT' },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        status: data.status,
      },
    });
  }

  async toggleStudentStatus(id: string, status: string) {
    return this.prisma.user.update({
      where: { id, role: 'STUDENT' },
      data: { status: status as any },
    });
  }

  async deleteStudent(id: string) {
    return this.prisma.user.delete({ where: { id, role: 'STUDENT' } });
  }

  async getRevenueStats() {
    const monthlyRevenue = await this.prisma.purchase.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });
    const totalRevenue = await this.prisma.purchase.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const monthlyTransactions = await this.prisma.purchase.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
    });
    // Tính growth (so với tháng trước)
    const lastMonthRevenue = await this.prisma.purchase.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });
    const growthPercent = lastMonthRevenue._sum.amount
      ? (((monthlyRevenue._sum.amount || 0) -
          (lastMonthRevenue._sum.amount || 0)) /
          (lastMonthRevenue._sum.amount || 1)) *
        100
      : 0;

    return {
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyTransactions,
      growthPercent,
    };
  }

  async getTransactions(limit: number) {
    return this.prisma.purchase.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        course: { select: { title: true } },
      },
    });
  }

  async getTeacherProfiles(query: any) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.teacherProfile.count({ where }),
    ]);

    return { data: items, totalPages: Math.ceil(total / limit) };
  }

  async reviewTeacherProfile(
    profileId: string,
    status: string,
    reason?: string,
  ) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ');
    if (profile.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Hồ sơ không ở trạng thái chờ duyệt');
    }

    // Cập nhật profile
    await this.prisma.teacherProfile.update({
      where: { id: profileId },
      data: { status: status as any },
    });

    // Nếu duyệt, cập nhật role user thành TEACHER
    if (status === 'APPROVED') {
      await this.prisma.user.update({
        where: { id: profile.userId },
        data: { role: 'TEACHER' },
      });
    }

    // Ghi log (có thể dùng bảng review_log)
    return { id: profileId, status };
  }
}
