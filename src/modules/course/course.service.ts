import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CourseStatus } from '@prisma/client';
import { EntityManager, In } from 'typeorm';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { ProcessReviewDto } from './dto/process-review.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { UpdateLessonMetadataDto } from './dto/update-lesson-metadata.dto';
import { UpdateOutcomesDto } from './dto/update-outcomes.dto';
import { User } from '../users/entities/user.entity';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @InjectEntityManager() private entityManager: EntityManager,
    private supabaseStorage: SupabaseStorageService,
  ) {}

  // ==================== SUPABASE STORAGE ====================
  /**
   * Tạo signed URL để upload file lên Supabase Storage
   * @param courseId ID khóa học (dùng để tạo thư mục)
   * @param fileName Tên file gốc
   * @param fileType MIME type của file
   */
  async getUploadSignedUrl(
    courseId: string,
    fileName: string,
    fileType: string,
  ) {
    // Kiểm tra khóa học tồn tại (tuỳ chọn)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    // Tạo key theo cấu trúc: courses/{courseId}/{timestamp}-{sanitizedFileName}
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `courses/${courseId}/${Date.now()}-${sanitized}`;
    return this.supabaseStorage.createSignedUploadUrl(fileKey);
  }

  /**
   * Xoá file trên Supabase Storage (gọi khi xoá bài học, xoá thumbnail...)
   * @param fileKey Đường dẫn file trong bucket
   */
  async deleteFileFromStorage(fileKey: string) {
    return this.supabaseStorage.deleteFile(fileKey);
  }

  // ==================== COURSE MANAGEMENT ====================
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
        instructorId,
        status: 'DRAFT',
      },
    });
  }

  async updateCourse(
    courseId: string,
    dto: UpdateCourseDto,
    teacherId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền cập nhật khóa học này');
    return this.prisma.course.update({
      where: { id: courseId },
      data: dto,
    });
  }

  async deleteCourse(courseId: string, teacherId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { sections: { include: { lessons: true } } },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xóa khóa học này');

    // Xoá tất cả file liên quan trên Supabase (thumbnails, video bài học...)
    // 1. Xoá thumbnail nếu có
    if (course.thumbnailUrl && course.thumbnailUrl.includes('supabase')) {
      const thumbnailKey = this.extractKeyFromUrl(course.thumbnailUrl);
      if (thumbnailKey)
        await this.deleteFileFromStorage(thumbnailKey).catch((e) =>
          console.error(e),
        );
    }
    // 2. Xoá video của từng bài học (nếu có lưu content là URL)
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.content && lesson.content.includes('supabase')) {
          const videoKey = this.extractKeyFromUrl(lesson.content);
          if (videoKey)
            await this.deleteFileFromStorage(videoKey).catch((e) =>
              console.error(e),
            );
        }
      }
    }
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  async getMyCourses(teacherId: string) {
    return this.prisma.course.findMany({
      where: { instructorId: teacherId },
      include: { _count: { select: { sections: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseDetailWithFullContent(courseId: string, teacherId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: { lessons: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException(
        'Bạn không có quyền xem nội dung khóa học này',
      );
    return course;
  }

  async findOnePublished(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: { lessons: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    return course;
  }

  async findOnePublishedWithEnrollmentStatus(
    courseId: string,
    userId?: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
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

  async findAllPublished(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const q = query.q || '';

    const where: any = { status: 'PUBLISHED' };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllForAdmin(query: any) {
    const { page = 1, limit = 10, status, q } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          _count: { select: { sections: true, purchases: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);
    const transformed = items.map((course) => ({
      ...course,
      revenue: 0,
      students: 0,
      instructor: { fullName: 'Unknown' },
    }));
    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateOutcomes(courseId: string, dto: UpdateOutcomesDto) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { outcomes: dto.outcomes },
    });
  }

  async submitCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: { select: { sections: true } },
        sections: { include: { _count: { select: { lessons: true } } } },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    if (!course.thumbnailUrl)
      throw new BadRequestException('Khóa học cần có ảnh đại diện (Thumbnail)');
    if (course._count.sections === 0)
      throw new BadRequestException('Khóa học phải có ít nhất một chương mục');
    const totalLessons = course.sections.reduce(
      (sum, s) => sum + s._count.lessons,
      0,
    );
    if (totalLessons === 0)
      throw new BadRequestException('Khóa học phải có ít nhất một bài học');
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'SUBMITTED' },
    });
  }

  async processReview(
    courseId: string,
    adminId: string,
    dto: ProcessReviewDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.status !== 'SUBMITTED')
      throw new BadRequestException(
        'Khóa học phải ở trạng thái chờ duyệt (SUBMITTED)',
      );

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.course.update({
        where: { id: courseId },
        data: { status: dto.action },
      });
      await tx.courseReviewLog.create({
        data: {
          courseId,
          adminId,
          action: dto.action,
          reason: dto.reason || 'No reason provided',
        },
      });
      return updated;
    });

    if (dto.action === CourseStatus.PUBLISHED) {
      this.eventEmitter.emit('course.published', {
        courseId: result.id,
        instructorId: result.instructorId,
        title: result.title,
      });
    }
    return result;
  }

  // ==================== SECTION MANAGEMENT ====================
  async getSections(courseId: string) {
    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      include: { lessons: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async addSection(courseId: string, dto: CreateSectionDto, teacherId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || course.instructorId !== teacherId)
      throw new ForbiddenException(
        'Bạn không có quyền thêm chương mục vào khóa học này',
      );
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
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật chương mục này',
      );
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { title },
    });
  }

  async deleteSection(sectionId: string, teacherId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true, lessons: true },
    });
    if (!section || section.course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xóa chương mục này');
    // Xoá tất cả bài học trong section (và cả file video của chúng)
    for (const lesson of section.lessons) {
      if (lesson.content && lesson.content.includes('supabase')) {
        const key = this.extractKeyFromUrl(lesson.content);
        if (key)
          await this.deleteFileFromStorage(key).catch((e) => console.error(e));
      }
    }
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
      throw new ForbiddenException('Bạn không có quyền sắp xếp chương mục');
    const updates = dto.orders.map((order) =>
      this.prisma.section.update({
        where: { id: order.id, courseId },
        data: { orderIndex: order.orderIndex },
      }),
    );
    await this.prisma.$transaction(updates);
    this.eventEmitter.emit('section.reordered', {
      courseId,
      sections: dto.orders,
    });
    return { success: true };
  }

  // ==================== LESSON MANAGEMENT ====================
  async addLesson(sectionId: string, dto: CreateLessonDto, teacherId: string) {
    // Lấy section kèm course để biết courseId
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section || section.course.instructorId !== teacherId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm bài học vào chương mục này',
      );
    }

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
        orderIndex: newOrderIndex,
        slug: slugify(dto.title, { lower: true, strict: true }),
        //  Quan hệ với section
        section: {
          connect: { id: sectionId },
        },
        //  Quan hệ với course (bắt buộc theo schema)
        course: {
          connect: { id: section.courseId },
        },
      },
    });
  }

  async deleteLesson(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson || lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xóa bài học này');
    // Xoá file video trên Supabase nếu có
    if (lesson.content && lesson.content.includes('supabase')) {
      const key = this.extractKeyFromUrl(lesson.content);
      if (key)
        await this.deleteFileFromStorage(key).catch((e) => console.error(e));
    }
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
      throw new ForbiddenException('Bạn không có quyền cập nhật bài học này');
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
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    if (lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xem bài học này');
    return lesson;
  }

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

  // ==================== ENROLLMENT & PROGRESS ====================
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

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: 'COMPLETED',
        purchasedAt: new Date(),
      },
    });
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

  // ==================== TEACHER STATISTICS & STUDENTS ====================
  async getTeacherDashboardStats(teacherId: string) {
    const totalCourses = await this.prisma.course.count({
      where: { instructorId: teacherId },
    });

    // Đếm số học viên duy nhất
    const distinctStudents = await this.prisma.purchase.findMany({
      where: {
        course: { instructorId: teacherId },
        status: 'COMPLETED',
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const totalStudents = distinctStudents.length;

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
    const [items, total] = await this.prisma.$transaction([
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
      progress: 0,
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

  async getAllStudentsByTeacher(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true, title: true },
    });
    const courseIds = courses.map((c) => c.id);
    const enrollments = await this.prisma.purchase.findMany({
      where: { courseId: { in: courseIds }, status: 'COMPLETED' },
      select: { userId: true, courseId: true, purchasedAt: true },
    });
    if (enrollments.length === 0) return [];
    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    const users = await this.entityManager.find(User, {
      where: { id: In(userIds) },
      select: ['id', 'fullName', 'email'],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return enrollments.map((enrollment) => ({
      id: enrollment.userId,
      fullName: userMap.get(enrollment.userId)?.fullName || 'Unknown',
      email: userMap.get(enrollment.userId)?.email || '',
      courseId: enrollment.courseId,
      courseTitle: courses.find((c) => c.id === enrollment.courseId)?.title,
      enrolledAt: enrollment.purchasedAt,
    }));
  }

  // ==================== UTILITY ====================
  private extractKeyFromUrl(url: string): string | null {
    // Ví dụ URL: https://xxx.supabase.co/storage/v1/object/public/bucket/courses/123/video.mp4
    try {
      const regex = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
