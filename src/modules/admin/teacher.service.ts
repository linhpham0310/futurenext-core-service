import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async getStats(instructorId: string) {
    const [totalCourses, totalStudents, totalRevenue, totalCertificates] =
      await Promise.all([
        this.prisma.course.count({ where: { instructorId } }),
        this.prisma.purchase.count({
          where: { course: { instructorId }, status: 'SUCCESS' },
          distinct: ['userId'],
        }),
        this.prisma.purchase.aggregate({
          where: { course: { instructorId }, status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        this.prisma.certificate.count({ where: { course: { instructorId } } }),
      ]);
    return {
      totalCourses,
      totalStudents,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalCertificates,
    };
  }

  async getMyCourses(instructorId: string) {
    return this.prisma.course.findMany({
      where: { instructorId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sections: true } } },
    });
  }

  async getCourse(id: string, instructorId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, instructorId },
      include: { sections: { include: { lessons: true } } },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }

  async getCourseStudents(courseId: string, instructorId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId },
    });
    if (!course) throw new ForbiddenException('Bạn không sở hữu khóa học này');
    const purchases = await this.prisma.purchase.findMany({
      where: { courseId, status: 'SUCCESS' },
      include: { user: true },
    });
    // Lấy tiến độ của từng học viên
    const students = await Promise.all(
      purchases.map(async (p) => {
        const progress = await this.prisma.learningProgress.aggregate({
          where: { userId: p.userId, courseId },
          _count: { _all: true },
          _sum: { status: { equals: 'COMPLETED' } }, // không dùng được, phải đếm thủ công
        });
        // Đếm số bài học đã hoàn thành
        const completed = await this.prisma.learningProgress.count({
          where: { userId: p.userId, courseId, status: 'COMPLETED' },
        });
        const total = await this.prisma.lesson.count({ where: { courseId } });
        return {
          id: p.user.id,
          fullName: p.user.fullName,
          email: p.user.email,
          progress: total ? Math.round((completed / total) * 100) : 0,
          joinedAt: p.createdAt,
          lastActiveAt: p.user.lastActiveAt,
        };
      }),
    );
    return students;
  }

  async getCourseBuilder(courseId: string, instructorId: string) {
    return this.getCourse(courseId, instructorId);
  }

  async getStudents(instructorId: string, query: any) {
    const { q, courseId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const whereCourse: any = { instructorId };
    if (courseId) whereCourse.id = courseId;

    const purchases = await this.prisma.purchase.findMany({
      where: { course: whereCourse, status: 'SUCCESS' },
      skip,
      take: +limit,
      include: { user: true, course: true },
      orderBy: { createdAt: 'desc' },
    });
    const total = await this.prisma.purchase.count({
      where: { course: whereCourse, status: 'SUCCESS' },
    });
    const items = purchases.map((p) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      email: p.user.email,
      enrolledCourse: p.course.title,
      progress: 0, // có thể tính thêm
      joinedAt: p.createdAt,
    }));
    return { data: items, totalPages: Math.ceil(total / limit) };
  }

  async getRevenueStats(instructorId: string) {
    const monthlyRevenue = await this.prisma.purchase.aggregate({
      where: {
        course: { instructorId },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });
    const totalRevenue = await this.prisma.purchase.aggregate({
      where: { course: { instructorId }, status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const monthlyTransactions = await this.prisma.purchase.count({
      where: {
        course: { instructorId },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'SUCCESS',
      },
    });
    // Tính growth (so với tháng trước)
    const lastMonthRevenue = await this.prisma.purchase.aggregate({
      where: {
        course: { instructorId },
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

  async getTransactions(instructorId: string, limit: number) {
    return this.prisma.purchase.findMany({
      where: { course: { instructorId }, status: 'SUCCESS' },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
        course: { select: { title: true } },
      },
    });
  }

  async exportRevenueReport(instructorId: string) {
    const transactions = await this.getTransactions(instructorId, 10000);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Doanh thu');
    worksheet.columns = [
      { header: 'Người dùng', key: 'userName', width: 20 },
      { header: 'Khóa học', key: 'courseTitle', width: 30 },
      { header: 'Số tiền', key: 'amount', width: 15 },
      { header: 'Ngày giao dịch', key: 'createdAt', width: 20 },
    ];
    transactions.forEach((tx) => {
      worksheet.addRow({
        userName: tx.user.fullName,
        courseTitle: tx.course.title,
        amount: tx.amount,
        createdAt: tx.createdAt.toISOString(),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async exportStudentsReport(instructorId: string) {
    const students = await this.getStudents(instructorId, { limit: 10000 });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Học viên');
    worksheet.columns = [
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Khóa học', key: 'enrolledCourse', width: 30 },
      { header: 'Ngày tham gia', key: 'joinedAt', width: 20 },
    ];
    students.data.forEach((s) => {
      worksheet.addRow({
        fullName: s.fullName,
        email: s.email,
        enrolledCourse: s.enrolledCourse,
        joinedAt: new Date(s.joinedAt).toISOString(),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async getPaymentSettings(userId: string) {
    const settings = await this.prisma.paymentSetting.findUnique({
      where: { userId },
    });
    return settings || { bankAccount: '', bankName: '', accountHolder: '' };
  }

  async updatePaymentSettings(userId: string, data: any) {
    return this.prisma.paymentSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getAnnouncements(instructorId: string) {
    return this.prisma.announcement.findMany({
      where: { course: { instructorId } },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(
    instructorId: string,
    data: { courseId: string; title: string; content: string },
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: data.courseId, instructorId },
    });
    if (!course) throw new ForbiddenException('Bạn không sở hữu khóa học này');
    return this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        courseId: data.courseId,
      },
    });
  }

  async getCertificates(instructorId: string) {
    return this.prisma.certificate.findMany({
      where: { course: { instructorId } },
      include: {
        user: { select: { fullName: true } },
        course: { select: { title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getExams(instructorId: string) {
    return this.prisma.exam.findMany({
      where: { instructorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExam(id: string, instructorId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, instructorId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    return exam;
  }

  async createExam(instructorId: string, data: any) {
    return this.prisma.exam.create({
      data: {
        ...data,
        instructorId,
      },
    });
  }

  async updateExam(id: string, instructorId: string, data: any) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, instructorId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    return this.prisma.exam.update({ where: { id }, data });
  }

  async deleteExam(id: string, instructorId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, instructorId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    return this.prisma.exam.delete({ where: { id } });
  }

  async publishExam(id: string, courseId: string, instructorId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, instructorId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId },
    });
    if (!course) throw new ForbiddenException('Bạn không sở hữu khóa học này');
    return this.prisma.courseExamAssignment.create({
      data: {
        examId: id,
        courseId,
      },
    });
  }

  async getExamResults(examId: string, instructorId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, instructorId },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    const assignments = await this.prisma.courseExamAssignment.findMany({
      where: { examId },
      include: {
        course: { include: { purchases: { include: { user: true } } } },
      },
    });
    // Lấy kết quả bài làm
    const results = [];
    for (const assign of assignments) {
      for (const purchase of assign.course.purchases) {
        const submission = await this.prisma.examSubmission.findFirst({
          where: { examId, userId: purchase.userId },
        });
        results.push({
          studentId: purchase.user.id,
          studentName: purchase.user.fullName,
          email: purchase.user.email,
          score: submission?.score ?? null,
          submittedAt: submission?.submittedAt ?? null,
          status: submission ? 'COMPLETED' : 'NOT_STARTED',
        });
      }
    }
    return { examTitle: exam.title, results };
  }

  async generateQuiz(data: any) {
    // Gọi AI service (tạm thời trả về mock)
    const { content, numQuestions, difficulty } = data;
    // TODO: tích hợp AI để sinh câu hỏi
    const questions = Array(numQuestions)
      .fill(null)
      .map((_, i) => ({
        question_text: `Câu hỏi ${i + 1} về ${content.substring(0, 30)}`,
        options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
        correct_answer: 'A',
        explanation: 'Giải thích cho câu hỏi này.',
      }));
    return { questions };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return {
      fullName: user.fullName,
      phone: user.phone,
      bio: user.bio,
      expertise: user.expertise,
    };
  }

  async updateProfile(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        bio: data.bio,
        expertise: data.expertise,
      },
    });
  }

  async changePassword(
    userId: string,
    body: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new ForbiddenException('Mật khẩu hiện tại không đúng');
    const newHash = await bcrypt.hash(body.newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}
