// src/modules/course/course.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { CreateSectionDto } from './dto/create-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { UpdateOutcomesDto } from './dto/update-outcomes.dto';
import { ProcessReviewDto } from './dto/process-review.dto';
import { CourseStatus } from '@prisma/client';
import { UpdateLessonMetadataDto } from './dto/update-lesson-metadata.dto';
import { createClient } from '@supabase/supabase-js';
import { sanitize } from '../common/utils/sanitize';
import ws from 'ws';
import { UpdateCourseDto } from './dto/update-course.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CourseService {
  [x: string]: any;
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      realtime: {
        transport: ws,
      },
    },
  );

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2, // Inject EventEmitter2
    @InjectEntityManager() private entityManager: EntityManager,
  ) {}

  async createDraft(instructorId: string, dto: CreateCourseDto) {
    const baseSlug = slugify(dto.title, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    const uniqueSlug = `${baseSlug}-${nanoid(6)}`;

    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug: uniqueSlug,
        description: dto.description,
        price: dto.price || 0,
        thumbnailUrl: dto.thumbnailUrl,
        instructorId: instructorId,
        status: 'DRAFT',
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.course.update({
      where: { id },
      data: data,
    });
  }

  async getUploadPresignedUrl(
    courseId: string,
    fileName: string,
    fileType: string,
  ) {
    // 1. Tạo Key lưu trữ theo cấu trúc: courses/{courseId}/{timestamp}-{fileName}
    // Cấu trúc này giúp quản lý file dễ dàng và tránh trùng tên
    const fileKey = `courses/${courseId}/${Date.now()}-${fileName}`;
    // 2. Gọi S3 Service để lấy URL
    const { data, error } = await this.supabase.storage
      .from('course-videos')
      .createSignedUploadUrl(fileKey);

    if (error) {
      throw new Error(error.message);
    }

    return {
      uploadUrl: data.signedUrl,
      fileKey,
    };
  }

  /**
   * TASK S4-CM-01: CẬP NHẬT KẾT QUẢ ĐẦU RA (SPRINT 4)
   * Lưu vào cột JSONB để phục vụ AI RAG sau này
   */
  async updateOutcomes(courseId: string, dto: UpdateOutcomesDto) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        // Prisma tự động xử lý chuyển đổi mảng TS sang JSONB của Postgres
        outcomes: dto.outcomes,
      },
    });
  }
  /**
   * TASK S4-CM-02: GỬI DUYỆT KHÓA HỌC (SPRINT 4)
   * Kiểm tra điều kiện đủ trước khi đổi trạng thái
   */
  async submitCourse(courseId: string) {
    // 1. Lấy thông tin khóa học kèm theo đếm số lượng Section và Lesson
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            sections: true,
          },
        },
        sections: {
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    // 2. KIỂM TRA ĐIỀU KIỆN (Validation Logic - Task S4-CM-02)
    // Điều kiện 1: Phải có ảnh Thumbnail
    if (!course.thumbnailUrl) {
      throw new BadRequestException(
        'Khóa học cần có ảnh đại diện (Thumbnail) trước khi gửi duyệt',
      );
    }
    // Điều kiện 2: Phải có ít nhất 1 Section
    if (course._count.sections === 0) {
      throw new BadRequestException(
        'Khóa học phải có ít nhất một chương mục (Section)',
      );
    }
    // Điều kiện 3: Tổng số bài học phải > 0
    const totalLessons = course.sections.reduce(
      (sum, section) => sum + section._count.lessons,
      0,
    );
    if (totalLessons === 0) {
      throw new BadRequestException(
        'Khóa học phải có ít nhất một bài học (Lesson) nội dung',
      );
    }
    // 3. Cập nhật trạng thái sang SUBMITTED
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'SUBMITTED' },
    });
  }
  /**
   * TASK S4-CM-03: ADMIN XỬ LÝ PHÊ DUYỆT KHÓA HỌC (SPRINT 4)
   * Sử dụng Transaction để đảm bảo tính ACID
   */
  async processReview(
    courseId: string,
    adminId: string,
    dto: ProcessReviewDto,
  ) {
    // 1. Kiểm tra khóa học có đang ở trạng thái SUBMITTED không
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Khóa học phải ở trạng thái chờ duyệt (SUBMITTED)',
      );
    }
    // 2. THỰC THI TRANSACTION (Task S4-CM-03)
    const result = await this.prisma.$transaction(async (tx) => {
      // Hành động A: Cập nhật trạng thái khóa học
      const updatedCourse = await tx.course.update({
        where: { id: courseId },
        data: { status: dto.action },
      });
      // Hành động B: Ghi nhật ký vào bảng course_review_logs
      await tx.courseReviewLog.create({
        data: {
          courseId: courseId,
          adminId: adminId,
          action: dto.action,
          reason: dto.reason || 'No reason provided',
        },
      });
      return updatedCourse;
    });
    // 3. TASK S4-CM-04: Phát sự kiện nếu khóa học được PUBLISHED
    if (dto.action === CourseStatus.PUBLISHED) {
      this.eventEmitter.emit('course.published', {
        courseId: result.id,
        instructorId: result.instructorId,
        title: result.title,
      });
    }

    return result;
  }

  /**
   * TASK S4-CM-05: CẬP NHẬT METADATA CHO AI (SPRINT 4)
   */
  async updateLessonMetadata(lessonId: string, dto: UpdateLessonMetadataDto) {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        aiMetadata: {
          keyConcepts: dto.keyConcepts,
          updatedAt: new Date().toISOString(),
          ...dto.otherMetadata,
        },
      },
    });
  }

  async findAllPublished(query: any) {
    return this.prisma.course.findMany({
      where: {
        status: CourseStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOnePublished(id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, status: CourseStatus.PUBLISHED },
      include: {
        sections: {
          include: { lessons: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }

  async getSections(courseId: string) {
    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      include: { lessons: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async getSectionsWithLessons(courseId: string) {
    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async findAllForAdmin(query: any) {
    const { page = 1, limit = 10, status, q } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { instructor: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { sections: true, enrollments: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);
    // Transform revenue (giả sử revenue tính từ enrollments * price)
    const transformed = items.map((course) => ({
      ...course,
      revenue: course._count.enrollments * course.price,
      students: course._count.enrollments,
    }));
    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTeacherDashboardStats(teacherId: string) {
    const totalCourses = await this.prisma.course.count({
      where: { instructorId: teacherId },
    });
    const totalStudents = await this.prisma.purchase.count({
      where: { course: { instructorId: teacherId }, status: 'COMPLETED' },
      distinct: ['userId'],
    });
    const totalRevenueAgg = await this.prisma.revenueTransaction.aggregate({
      _sum: { amount: true },
      where: { teacherId, status: 'SUCCESS' },
    });
    const totalCertificates = await this.prisma.certificate.count({
      where: { course: { instructorId: teacherId } },
    });
    return {
      totalCourses,
      totalStudents,
      totalRevenue: totalRevenueAgg._sum.amount || 0,
      totalCertificates,
    };
  }

  async getTeacherStudents(
    teacherId: string,
    query: { q?: string; page?: number; limit?: number },
  ) {
    const { q, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);
    const where: any = { courseId: { in: courseIds }, status: 'COMPLETED' };
    if (q) {
      where.user = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }
    const [items, total] = await this.prisma.purchase.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          course: { select: { title: true } },
        },
        skip,
        take: limit,
        distinct: ['userId'],
      }),
      this.prisma.purchase.count({ where }),
    ]);
    const transformed = items.map((p) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      email: p.user.email,
      enrolledCourse: p.course.title,
      progress: 0, // có thể tính từ learning_progress
      joinedAt: p.purchasedAt,
    }));
    return {
      data: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseStudents(teacherId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: teacherId },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    const enrollments = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });
    return enrollments.map((e) => ({
      id: e.user.id,
      fullName: e.user.fullName,
      email: e.user.email,
      progress: 0,
      joinedAt: e.purchasedAt,
      lastActiveAt: null,
    }));
  }

  async updateCourse(
    courseId: string,
    dto: UpdateCourseDto,
    teacherId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException();
    if (course.instructorId !== teacherId) throw new ForbiddenException();
    return this.prisma.course.update({
      where: { id: courseId },
      data: dto,
    });
  }

  async deleteCourse(courseId: string, teacherId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException();
    if (course.instructorId !== teacherId) throw new ForbiddenException();
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  async getCourseDetailWithFullContent(courseId: string, teacherId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { sections: { include: { lessons: true } } },
    });
    if (!course) throw new NotFoundException();
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException();
    return course;
  }

  async addSection(courseId: string, dto: CreateSectionDto, teacherId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.instructorId !== teacherId)
      throw new ForbiddenException();
    const lastSection = await this.prisma.section.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const newOrderIndex = lastSection ? lastSection.orderIndex + 1 : 1;
    return this.prisma.section.create({
      data: { title: dto.title, courseId, orderIndex: newOrderIndex },
    });
  }

  async updateSection(sectionId: string, title: string, teacherId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section || section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { title },
    });
  }

  async deleteSection(sectionId: string, teacherId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section || section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.section.delete({ where: { id: sectionId } });
  }

  async reorderSections(
    courseId: string,
    dto: ReorderSectionsDto,
    teacherId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.instructorId !== teacherId)
      throw new ForbiddenException();
    const updates = dto.orders.map((order) =>
      this.prisma.section.update({
        where: { id: order.id, courseId },
        data: { orderIndex: order.orderIndex },
      }),
    );
    await this.prisma.$transaction(updates);
    // emit event
    this.eventEmitter.emit('section.reordered', {
      courseId,
      sections: dto.orders,
    });
    return { success: true };
  }

  async addLesson(sectionId: string, dto: CreateLessonDto, teacherId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section || section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { sectionId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const newOrderIndex = lastLesson ? lastLesson.orderIndex + 1 : 1;
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        type: dto.type,
        content: dto.content,
        duration: dto.duration,
        isFreePreview: dto.isFreePreview || false,
        sectionId,
        orderIndex: newOrderIndex,
        slug: slugify(dto.title, { lower: true }),
      },
    });
  }

  async deleteLesson(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson || lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  async updateLessonContent(
    lessonId: string,
    dto: UpdateLessonContentDto,
    teacherId: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson || lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { content: dto.content, duration: dto.duration },
    });
  }

  async getLessonById(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson || lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException();
    return lesson;
  }

  async getEnrolledCourses(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });
    // Lấy progress cho từng course
    const coursesWithProgress = await Promise.all(
      purchases.map(async (p) => {
        const totalLessons = await this.prisma.lesson.count({
          where: { courseId: p.course.id },
        });
        const completedLessons = await this.prisma.learningProgress.count({
          where: { userId, courseId: p.course.id, status: 'COMPLETED' },
        });
        const progress =
          totalLessons === 0
            ? 0
            : Math.round((completedLessons / totalLessons) * 100);
        return {
          id: p.course.id,
          title: p.course.title,
          description: p.course.description,
          thumbnail: p.course.thumbnailUrl,
          progress,
        };
      }),
    );
    return coursesWithProgress;
  }

  async enrollCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, status: 'PUBLISHED' },
    });
    if (!course)
      throw new NotFoundException(
        'Khóa học không tồn tại hoặc chưa được xuất bản',
      );
    const existing = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing)
      throw new BadRequestException('Bạn đã đăng ký khóa học này rồi');
    // Giả sử thanh toán thành công, tạo purchase
    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: 'COMPLETED',
        purchasedAt: new Date(),
      },
    });
    // Tạo revenue transaction cho teacher
    await this.prisma.revenueTransaction.create({
      data: {
        userId,
        teacherId: course.instructorId,
        courseId,
        amount: course.price,
        type: 'PURCHASE',
        status: 'SUCCESS',
      },
    });
    // Tạo thông báo cho teacher
    await this.prisma.notification.create({
      data: {
        userId: course.instructorId,
        title: 'Học viên mới đăng ký',
        description: `Học viên đã đăng ký khóa học "${course.title}"`,
        link: `/teacher/courses/${courseId}/students`,
      },
    });
    return purchase;
  }

  async findOnePublishedWithEnrollmentStatus(
    courseId: string,
    userId?: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: 'PUBLISHED' },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: { lessons: { orderBy: { orderIndex: 'asc' } } },
        },
        _count: { select: { purchases: true } },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    let isEnrolled = false;
    if (userId) {
      const purchase = await this.prisma.purchase.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      isEnrolled = !!purchase;
    }
    const totalDuration = course.sections
      .flatMap((s) => s.lessons)
      .reduce((sum, l) => sum + (l.duration || 0), 0);

    return {
      ...course,
      students: course._count.purchases,
      duration: `${Math.round(totalDuration / 60)} giờ`,
      rating: 0,
      outcomes: (course.outcomes as string[]) || [],
      isEnrolled,
    };
  }

  async getMyCourses(teacherId: string) {
    return this.prisma.course.findMany({
      where: { instructorId: teacherId },
      include: { _count: { select: { sections: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllStudentsByTeacher(teacherId: string) {
    // 1. Lấy tất cả khóa học của teacher
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true, title: true },
    });
    const courseIds = courses.map((c) => c.id);

    // 2. Lấy tất cả giao dịch thành công của các khóa đó
    const enrollments = await this.prisma.purchase.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED',
      },
      select: {
        userId: true,
        courseId: true,
        purchasedAt: true,
      },
    });

    if (enrollments.length === 0) return [];

    // 3. Lấy thông tin user từ TypeORM
    const userIds: string[] = [
      ...new Set(enrollments.map((e) => e.userId)),
    ] as string[];
    const users = await this.entityManager.find(User, {
      where: { id: In(userIds) },
      select: ['id', 'fullName', 'email'],
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 4. Ghép dữ liệu
    return enrollments.map((enrollment) => ({
      id: enrollment.userId,
      fullName: userMap.get(enrollment.userId)?.fullName || 'Unknown',
      email: userMap.get(enrollment.userId)?.email || '',
      courseId: enrollment.courseId,
      courseTitle: courses.find((c) => c.id === enrollment.courseId)?.title,
      enrolledAt: enrollment.purchasedAt,
    }));
  }
}
