// src/modules/course/course.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import slugify from 'slugify';
import { nanoid } from 'nanoid';

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
}
