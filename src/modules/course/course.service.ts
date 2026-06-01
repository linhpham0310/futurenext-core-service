// src/modules/course/course.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { CreateSectionDto } from './dto/create-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { S3Service } from '../common/s3.service';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { UpdateOutcomesDto } from './dto/update-outcomes.dto';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2, // Inject EventEmitter2
    private s3Service: S3Service, // Inject S3Service mới
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
        ...dto,
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
    const uploadUrl = await this.s3Service.generatePresignedUrl(
      fileKey,
      fileType,
    );
    return {
      uploadUrl,
      fileKey, // Trả về key để Frontend sau đó gửi lại Backend lưu vào DB
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
}
