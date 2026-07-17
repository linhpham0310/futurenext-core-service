import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { CourseStatus } from '@prisma/client';
import { EntityManager, In, Repository } from 'typeorm';
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
import { AiService } from '../ai/ai.service';
import { UpdateLessonFullDto } from './dto/update-lesson-full.dto';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @InjectEntityManager() private entityManager: EntityManager,
    private supabaseStorage: SupabaseStorageService,
    private aiService: AiService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `courses/${courseId}/${Date.now()}-${sanitized}`;
    // Upload video vào bucket "course-videos"
    return this.supabaseStorage.createSignedUploadUrl(fileKey, 'course-videos');
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

    // Không cho phép đổi status qua endpoint update chung
    // Mọi thay đổi trạng thái phải qua approve/reject/processReview để có review log
    const { status, ...safeData } = dto as any;

    return this.prisma.course.update({
      where: { id: courseId },
      data: safeData,
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
          include: {
            lessons: { orderBy: { orderIndex: 'asc' } },
            mappings: { include: { outcome: true } },
          },
        },
        reviewLogs: { orderBy: { createdAt: 'desc' } },
        learningOutcomes: { orderBy: { orderIndex: 'asc' } },
        category: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (teacherId && course.instructorId !== teacherId) {
      throw new ForbiddenException('You do not own this course');
    }

    // Lấy instructor từ TypeORM
    const instructor = await this.userRepository.findOne({
      where: { id: course.instructorId },
      select: ['id', 'fullName', 'email'],
    });

    // Lấy admin IDs từ reviewLogs
    const adminIds = course.reviewLogs
      .map((log) => log.adminId)
      .filter(Boolean);
    let adminMap = new Map<string, string>();
    if (adminIds.length > 0) {
      const admins = await this.entityManager.find(User, {
        where: { id: In(adminIds) },
        select: ['id', 'fullName'],
      });
      adminMap = new Map(admins.map((u) => [u.id, u.fullName]));
    }

    // Xây dựng reviewLogs với adminName thật
    const reviewLogs = course.reviewLogs.map((log) => ({
      adminName: adminMap.get(log.adminId) || 'Unknown Admin',
      action: log.action,
      reason: log.reason,
      createdAt: log.createdAt,
    }));

    // Tính students và rating
    const students = await this.prisma.purchase.count({
      where: { courseId, status: 'COMPLETED' },
    });
    const reviews = await this.prisma.review.findMany({
      where: { courseId },
      select: { rating: true },
    });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Xây dựng sections với loMappings (nếu có)
    const sectionsWithMappings = course.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => {
        const aiMetadata = (lesson.aiMetadata as any) || {};
        return {
          ...lesson,
          mainTopics: aiMetadata.mainTopics || [],
        };
      }),
      loMappings: section.mappings.map((m) => ({
        loId: m.outcome.id,
        loTitle: m.outcome.title,
      })),
    }));

    return {
      ...course,
      instructor,
      students,
      rating: avgRating,
      reviewLogs,
      sections: sectionsWithMappings,
      outcomes: course.learningOutcomes || [],
    };
  }

  async findOnePublished(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.APPROVED },
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
      where: { id: courseId, status: CourseStatus.APPROVED },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: { lessons: { orderBy: { orderIndex: 'asc' } } },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
        _count: { select: { purchases: true } },
        learningOutcomes: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, title: true, description: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    // Lấy instructor bằng TypeORM
    const instructor = await this.entityManager.findOne(User, {
      where: { id: course.instructorId },
      select: ['id', 'fullName', 'email', 'avatarUrl', 'bio', 'title'],
    });

    // Kiểm tra đã đăng ký chưa
    let isEnrolled = false;
    let progress = 0;
    if (userId) {
      const purchase = await this.prisma.purchase.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      isEnrolled = !!purchase;
      if (isEnrolled) {
        const totalLessons = await this.prisma.lesson.count({
          where: { courseId },
        });
        const completed = await this.prisma.learningProgress.count({
          where: { userId, courseId, status: 'COMPLETED' },
        });
        progress =
          totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      }
    }

    // Tính rating
    const avgRating =
      course.reviews.length > 0
        ? course.reviews.reduce((sum, r) => sum + r.rating, 0) /
          course.reviews.length
        : 0;

    // Tổng thời lượng
    const totalDuration = course.sections
      .flatMap((s) => s.lessons)
      .reduce((sum, l) => sum + (l.duration || 0), 0);

    // Lấy danh sách câu hỏi (có trả lời)
    const questions = await this.prisma.question.findMany({
      where: { courseId, answer: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    // Gộp user names cho reviews và questions
    const reviewUserIds = course.reviews.map((r) => r.userId);
    const questionUserIds = questions.map((q) => q.userId);
    const allUserIds = [...new Set([...reviewUserIds, ...questionUserIds])];
    const users = allUserIds.length
      ? await this.entityManager.find(User, {
          where: { id: In(allUserIds) },
          select: ['id', 'fullName'],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const reviewsWithUser = course.reviews.map((r) => ({
      ...r,
      user: { fullName: userMap.get(r.userId)?.fullName ?? 'Unknown' },
    }));

    const questionsWithUser = questions.map((q) => ({
      ...q,
      user: { fullName: userMap.get(q.userId)?.fullName ?? 'Unknown' },
    }));

    // Lấy outcomes
    const outcomes =
      (course.outcomes as string[])?.length > 0
        ? (course.outcomes as string[])
        : course.learningOutcomes.map((lo) => lo.title);

    return {
      ...course,
      students: course._count.purchases,
      duration: `${Math.round(totalDuration / 60)} giờ`,
      rating: avgRating,
      outcomes,
      isEnrolled,
      progress,
      reviews: reviewsWithUser,
      questions: questionsWithUser,
      instructor, // đã có
    };
  }

  async findAllPublished(query: any) {
    const {
      page = 1,
      limit = 10,
      q = '',
      category,
      level,
      minPrice,
      maxPrice,
      rating,
      sortBy,
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const where: any = { status: 'APPROVED' };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;
    if (level) where.level = level;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = Number(minPrice);
      if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          category: true,
          _count: { select: { purchases: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    // Lấy instructor qua TypeORM, đúng pattern dual-ORM
    const instructorIds = [...new Set(items.map((c) => c.instructorId))];
    const instructors = instructorIds.length
      ? await this.entityManager.find(User, {
          where: { id: In(instructorIds) },
          select: ['id', 'fullName', 'email', 'avatarUrl'],
        })
      : [];
    const instructorMap = new Map(instructors.map((u) => [u.id, u]));

    const mapped = items.map((course) => ({
      ...course,
      students: course._count.purchases,
      instructor: instructorMap.get(course.instructorId) || {
        id: course.instructorId,
        fullName: 'Unknown',
        email: '',
        avatarUrl: null,
      },
    }));

    return {
      data: mapped,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
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
          reviewLogs: true,
          _count: { select: { purchases: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    // Lấy instructor
    const instructorIds = [...new Set(items.map((c) => c.instructorId))];
    const instructorMap = await this.getInstructorMap(
      instructorIds as string[],
    );

    // Lấy revenue cho từng course (aggregate từ Purchase)
    const courseIds = items.map((c) => c.id);
    const revenues = await this.prisma.purchase.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds }, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    const revenueMap = new Map(
      revenues.map((r) => [r.courseId, r._sum.amount || 0]),
    );

    const transformed = items.map((course) => ({
      ...course,
      instructor: instructorMap.get(course.instructorId) || {
        id: course.instructorId,
        fullName: 'Unknown',
        email: '',
      },
      students: course._count.purchases,
      revenue: revenueMap.get(course.id) || 0,
    }));

    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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

  async approveCourse(courseId: string, adminId: string) {
    return this.processReview(courseId, adminId, { action: 'APPROVED' });
  }

  async rejectCourse(courseId: string, adminId: string, reason: string) {
    return this.processReview(courseId, adminId, {
      action: 'REJECTED',
      reason,
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
    if (course.status !== 'SUBMITTED') {
      throw new BadRequestException('Khóa học phải ở trạng thái chờ duyệt');
    }

    // Kiểm tra action hợp lệ
    if (dto.action !== 'APPROVED' && dto.action !== 'REJECTED') {
      throw new BadRequestException('Action phải là APPROVED hoặc REJECTED');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.course.update({
        where: { id: courseId },
        data: { status: dto.action },
      });
      await tx.courseReviewLog.create({
        data: {
          courseId,
          adminId,
          action: dto.action,
          reason: dto.reason,
        },
      });
      if (dto.action === 'APPROVED') {
        this.eventEmitter.emit('course.published', {
          courseId,
          instructorId: updated.instructorId,
        });
      }
      return updated;
    });
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
        courseId: section.courseId,
        section: {
          connect: { id: sectionId },
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
      include: {
        section: { include: { course: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');
    if (lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xem bài học này');

    // Trả về thêm aiMetadata, mainTopics (nếu có)
    const aiMetadata = (lesson.aiMetadata as any) || {};
    return {
      ...lesson,
      isAiEnabled: aiMetadata.isAiEnabled || false,
      aiContext: {
        customInstructions: aiMetadata.customInstructions || '',
        faqs: aiMetadata.faqs || [],
      },
      mainTopics: aiMetadata.mainTopics || [],
      examId: aiMetadata.examId || null,
    };
  }

  async updateLessonFull(
    lessonId: string,
    dto: UpdateLessonFullDto,
    teacherId: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson || lesson.section.course.instructorId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền cập nhật bài học này');

    const updateData: any = {};
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.duration !== undefined) updateData.duration = dto.duration;

    // Cập nhật aiMetadata
    const currentAiMetadata = (lesson.aiMetadata as any) || {};
    if (dto.isAiEnabled !== undefined)
      currentAiMetadata.isAiEnabled = dto.isAiEnabled;
    if (dto.aiContext) {
      currentAiMetadata.customInstructions = dto.aiContext.customInstructions;
      currentAiMetadata.faqs = dto.aiContext.faqs;
    }
    if (dto.mainTopics) currentAiMetadata.mainTopics = dto.mainTopics;
    if (dto.examId) currentAiMetadata.examId = dto.examId;
    updateData.aiMetadata = currentAiMetadata;

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });
  }

  async updateLessonMetadata(lessonId: string, dto: UpdateLessonMetadataDto) {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        aiMetadata: {
          mainTopics: dto.mainTopics,
          updatedAt: new Date().toISOString(),
          ...dto.otherMetadata,
        },
      },
    });
  }

  // ==================== ENROLLMENT & PROGRESS ====================

  async enrollCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId, status: 'APPROVED' },
      select: { id: true, price: true, status: true },
    });
    if (!course) {
      throw new NotFoundException(
        'Khóa học không tồn tại hoặc chưa được xuất bản',
      );
    }

    // Kiểm tra user đã có purchase chưa
    const existing = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing && existing.status === 'COMPLETED') {
      return this.enrollExisting(userId, courseId); // đã enroll, không làm gì thêm
    }

    // Nếu khóa học trả phí -> không cho enroll trực tiếp
    if (course.price > 0) {
      throw new BadRequestException(
        'Khóa học này cần thanh toán. Vui lòng thêm vào giỏ hàng.',
      );
    }

    // Khóa học free -> tạo purchase
    await this.prisma.purchase.create({
      data: {
        userId,
        courseId,
        amount: 0,
        status: 'COMPLETED',
        purchasedAt: new Date(),
        paymentMethod: 'FREE',
      },
    });
    return this.enrollExisting(userId, courseId);
  }

  private async enrollExisting(userId: string, courseId: string) {
    // Đảm bảo có learning progress cho tất cả bài học (nếu chưa có)
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const existing = await this.prisma.learningProgress.findFirst({
      where: { userId, courseId },
    });
    if (!existing && lessons.length) {
      await this.prisma.learningProgress.createMany({
        data: lessons.map((l) => ({
          userId,
          courseId,
          lessonId: l.id,
          status: 'NOT_STARTED',
          lastPosition: 0,
        })),
        skipDuplicates: true,
      });
    }
    return { success: true, message: 'Đăng ký khóa học thành công' };
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
          course: { select: { id: true, title: true } },
        },
        skip,
        take: limit,
        distinct: ['userId'],
      }),
      this.prisma.purchase.count({ where }),
    ]);

    // Tính tiến độ cho từng item
    const transformedWithProgress = await Promise.all(
      items.map(async (p) => {
        // Đếm tổng số bài học của khóa học
        const totalLessons = await this.prisma.lesson.count({
          where: { courseId: p.course.id },
        });
        // Đếm số bài học đã hoàn thành của học viên trong khóa học này
        const completedLessons = await this.prisma.learningProgress.count({
          where: {
            userId: p.user.id,
            courseId: p.course.id,
            status: 'COMPLETED',
          },
        });
        const progress =
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        return {
          id: p.user.id,
          fullName: p.user.fullName,
          email: p.user.email,
          enrolledCourse: p.course.title,
          progress: progress,
          joinedAt: p.purchasedAt,
        };
      }),
    );

    return {
      data: transformedWithProgress,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseStudents(
    teacherId: string,
    courseId: string,
    bypassOwnership = false,
  ) {
    const course = await this.prisma.course.findFirst({
      where: bypassOwnership
        ? { id: courseId }
        : { id: courseId, instructorId: teacherId },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');

    const enrollments = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      orderBy: { purchasedAt: 'desc' },
    });

    const userIds = [...new Set(enrollments.map((e) => e.userId))];
    const users = userIds.length
      ? await this.entityManager.find(User, {
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'email'],
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Tính tiến độ cho từng học viên
    const totalLessons = await this.prisma.lesson.count({
      where: { courseId },
    });
    const result = await Promise.all(
      enrollments.map(async (e) => {
        const user = userMap.get(e.userId);
        const completed = await this.prisma.learningProgress.count({
          where: { userId: e.userId, courseId, status: 'COMPLETED' },
        });
        const progress =
          totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        const lastActive = await this.prisma.learningProgress.findFirst({
          where: { userId: e.userId, courseId },
          orderBy: { updatedAt: 'desc' },
        });
        return {
          id: user?.id ?? e.userId,
          fullName: user?.fullName ?? 'Unknown',
          email: user?.email ?? '',
          progress,
          joinedAt: e.purchasedAt,
          lastActiveAt: lastActive?.updatedAt || null,
        };
      }),
    );
    return result;
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

  async generateOutline(courseId: string): Promise<any[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return this.aiService.generateOutline(course.title, course.description);
  }

  // Lấy danh sách outcomes
  async getOutcomes(courseId: string) {
    return this.prisma.learningOutcome.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // Thêm một outcome
  async addOutcome(courseId: string, title: string, description?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    const last = await this.prisma.learningOutcome.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
    });
    return this.prisma.learningOutcome.create({
      data: {
        courseId,
        title,
        description,
        orderIndex: last ? last.orderIndex + 1 : 1,
      },
    });
  }

  async updateOutcomes(courseId: string, dto: UpdateOutcomesDto) {
    const { outcomes } = dto;
    // Xóa tất cả outcomes cũ
    await this.prisma.learningOutcome.deleteMany({ where: { courseId } });
    // Tạo mới
    if (outcomes && outcomes.length) {
      await this.prisma.learningOutcome.createMany({
        data: outcomes.map((o, idx) => ({
          courseId,
          title: o.title,
          description: o.description || '',
          orderIndex: idx + 1,
        })),
      });
    }
    return this.getOutcomes(courseId);
  }

  // Xóa một outcome
  async deleteOutcome(courseId: string, outcomeId: string) {
    const outcome = await this.prisma.learningOutcome.findFirst({
      where: { id: outcomeId, courseId },
    });
    if (!outcome) throw new NotFoundException('Outcome không tồn tại');
    return this.prisma.learningOutcome.delete({ where: { id: outcomeId } });
  }

  private async getInstructorMap(userIds: string[]): Promise<Map<string, any>> {
    if (!userIds.length) return new Map();
    const users = await this.entityManager.find(User, {
      where: { id: In(userIds) },
      select: ['id', 'fullName', 'email'],
    });
    return new Map(users.map((u) => [u.id, u]));
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
