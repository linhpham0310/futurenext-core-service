import {
  Controller,
  Get,
  Param,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Patch,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CourseService } from '../course.service';
import { UserRole } from '@/modules/users/entities/user.entity';
import { Request } from '@nestjs/common';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { PrismaService } from 'prisma/prisma.service';

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCourseController {
  constructor(
    private readonly courseService: CourseService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getAllCourses(@Query() query: any) {
    return this.courseService.findAllForAdmin(query);
  }

  @Get(':id')
  async getCourseDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @Patch(':id/approve')
  async approveCourse(@Param('id') id: string, @Request() req) {
    return this.courseService.processReview(id, req.user.sub, {
      action: 'PUBLISHED',
    });
  }

  @Patch(':id/reject')
  async rejectCourse(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Request() req,
  ) {
    return this.courseService.processReview(id, req.user.sub, {
      action: 'REJECTED',
      reason: dto.reason,
    });
  }

  @Put(':id')
  async updateCourse(
    courseId: string,
    dto: UpdateCourseDto,
    teacherId?: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException();
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.course.update({ where: { id: courseId }, data: dto });
  }

  async deleteCourse(courseId: string, teacherId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException();
    if (teacherId && course.instructorId !== teacherId)
      throw new ForbiddenException();
    return this.prisma.course.delete({ where: { id: courseId } });
  }
}
