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

@Injectable()
export class CourseService {
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
        ...dto,
        sectionId: sectionId,
        orderIndex: newOrderIndex,
        slug: slugify(dto.title, { lower: true }), // Tạo slug cho bài học
      },
    });
  }
}
