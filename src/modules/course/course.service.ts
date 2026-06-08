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

@Injectable()
export class CourseService {
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

  // TASK S2-CM-01: THÊM CHƯƠNG MỤC MỚI
  async addSection(courseId: string, dto: CreateSectionDto) {
    // 1. Tìm order_index lớn nhất hiện tại của khóa học này
    const lastSection = await this.prisma.section.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    // 2. Tính toán index mới (Nếu chưa có thì bắt đầu từ 1)
    const newOrderIndex = lastSection ? lastSection.orderIndex + 1 : 1;
    // 3. Tạo record mới trong bảng sections
    return this.prisma.section.create({
      data: {
        title: dto.title,
        courseId: courseId,
        orderIndex: newOrderIndex,
      },
    });
  }

  async reorderSections(courseId: string, dto: ReorderSectionsDto) {
    // 1. Thực hiện Transaction (Logic từ Task 2.2)
    const updatedSections = await this.prisma.$transaction(
      dto.orders.map((item) =>
        this.prisma.section.update({
          where: { id: item.id, courseId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );
    // 2. TASK S2-CM-03: Phát sự kiện sau khi DB update thành công
    // Việc này giúp AI Worker hoặc Cache Manager biết để cập nhật lại
    this.eventEmitter.emit('section.reordered', {
      courseId,
      sections: dto.orders,
      timestamp: new Date(),
    });
    return updatedSections;
  }
  // TASK S3-CM-01: THÊM BÀI HỌC MỚI (SPRINT 3)
  async addLesson(sectionId: string, dto: CreateLessonDto) {
    // 1. Kiểm tra Section có tồn tại không
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Chương mục không tồn tại');
    // 2. Tìm orderIndex lớn nhất trong Section này
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { sectionId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const newOrderIndex = lastLesson ? lastLesson.orderIndex + 1 : 1;
    // 3. Tạo bài học mới
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        type: dto.type,
        content: dto.content, // có thể undefined
        duration: dto.duration,
        isFreePreview: dto.isFreePreview || false,
        sectionId: sectionId,
        orderIndex: newOrderIndex,
        slug: slugify(dto.title, { lower: true }), // Tạo slug cho bài học
      },
    });
  }
  // TASK S3-CM-02: Xử lý yêu cầu cấp phép upload
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
   * TASK S3-CM-03: CẬP NHẬT NỘI DUNG CHI TIẾT BÀI HỌC (SPRINT 3)
   * Hỗ trợ cả lưu URL Video (từ S3) và nội dung Markdown
   */
  async updateLessonContent(lessonId: string, dto: UpdateLessonContentDto) {
    // 1. Kiểm tra bài học có tồn tại không
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học để cập nhật');
    }
    // 2. Cập nhật dữ liệu vào DB
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        content: dto.content,
        duration: dto.duration ?? lesson.duration, // Giữ nguyên duration cũ nếu không gửi mới
      },
    });
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

  async getMyCourses(userId: string) {
    return this.prisma.course.findMany({
      where: { instructorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseDetailWithFullContent(id: string) {
    console.log('Fetching course:', id);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { sections: { include: { lessons: true } } },
    });
    console.log('Course found:', course);
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async getSections(courseId: string) {
    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      include: { lessons: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async updateSection(sectionId: string, dto: { title: string }) {
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { title: dto.title },
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

  async getLessonById(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
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
    const [items, total] = await this.prisma.course.findManyAndCount({
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
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
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

  async updateCourse(id: string, dto: UpdateCourseDto) {
    return this.prisma.course.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCourse(id: string) {
    // Kiểm tra có khóa học không
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    // Xóa các liên quan? Có thể xóa mềm hoặc hard delete tùy nghiệp vụ
    return this.prisma.course.delete({ where: { id } });
  }

  async getEnrolledCourses(userId: string) {
    const enrollments = await this.prisma.purchase.findMany({
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
    // Tính progress? Có thể tính từ learning_progress
    return enrollments.map((e) => ({
      id: e.course.id,
      title: e.course.title,
      description: e.course.description,
      thumbnail: e.course.thumbnailUrl,
      progress: 0, // sẽ tính sau
    }));
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
    // TODO: Xử lý thanh toán
    return this.prisma.purchase.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: 'COMPLETED', // tạm thời bỏ qua thanh toán
        purchasedAt: new Date(),
      },
    });
  }

  async findOnePublishedWithEnrollmentStatus(id: string, userId?: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        sections: {
          include: { lessons: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    let isEnrolled = false;
    if (userId) {
      const enrollment = await this.prisma.purchase.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      });
      isEnrolled = !!enrollment;
    }
    return { ...course, isEnrolled };
  }
  async getTeacherStudents(teacherId: string, query: any) {
    const { q, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    // Lấy danh sách học viên đã đăng ký các khóa học của teacher
    const courses = await this.prisma.course.findMany({
      where: { instructorId: teacherId },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);
    const where: any = {
      courseId: { in: courseIds },
    };
    if (q) {
      where.user = {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }
    const [items, total] = await this.prisma.purchase.findManyAndCount({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        course: {
          select: { title: true },
        },
      },
      skip,
      take: limit,
      distinct: ['userId'], // mỗi học viên chỉ một lần
    });
    const transformed = items.map((p) => ({
      id: p.user.id,
      fullName: p.user.fullName,
      email: p.user.email,
      enrolledCourse: p.course.title,
      progress: 0, // có thể tính sau
      joinedAt: p.purchasedAt,
    }));
    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCourseStudents(teacherId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: teacherId },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học này');
    const enrollments = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
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
}
