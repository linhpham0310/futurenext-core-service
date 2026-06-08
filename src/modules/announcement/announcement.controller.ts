import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '../users/entities/user.entity';

class CreateAnnouncementDto {
  courseId: string;
  title: string;
  content: string;
}

@Controller('teacher/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherAnnouncementController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getMyAnnouncements(@Request() req) {
    return this.prisma.announcement.findMany({
      where: { teacherId: req.user.sub },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async createAnnouncement(@Request() req, @Body() dto: CreateAnnouncementDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instructorId: req.user.sub },
    });
    if (!course) throw new ForbiddenException('Course not found or not yours');
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        courseId: dto.courseId,
        teacherId: req.user.sub,
      },
    });
  }
}
