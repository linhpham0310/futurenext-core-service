// src/modules/course/course.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { CreateSectionDto } from './dto/create-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

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

  // TASK S2-CM-02: CẬP NHẬT THỨ TỰ CHƯƠNG MỤC HÀNG LOẠT
  async reorderSections(courseId: string, dto: ReorderSectionsDto) {
    // Sử dụng Transaction để đảm bảo tính an toàn dữ liệu
    return await this.prisma.$transaction(
      dto.orders.map((item) =>
        this.prisma.section.update({
          where: {
            id: item.id,
            courseId: courseId, // Bảo mật thêm 1 lớp: phải đúng khóa học
          },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );
  }
}
