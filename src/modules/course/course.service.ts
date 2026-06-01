import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Đường dẫn tùy dự án của bạn
import { CreateCourseDto } from './dto/create-course.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}
  async createDraft(instructorId: string, dto: CreateCourseDto) {
    // 1. Tạo slug tự động (Task S1-CM-03)
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    const uniqueSlug = `${baseSlug}-${nanoid(6)}`;
    // 2. Lưu vào DB với trạng thái DRAFT
    return this.prisma.course.create({
      data: {
        ...dto,
        slug: uniqueSlug,
        instructorId: instructorId,
        status: 'DRAFT', // Ép buộc trạng thái nháp
      },
    });
  }
}
