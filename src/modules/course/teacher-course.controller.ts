import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';

@Controller('teacher/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherCourseController {
  constructor(private courseService: CourseService) {}

  @Get()
  async getMyCourses(@Request() req) {
    return this.courseService.getMyCourses(req.user.sub);
  }

  @Get('dashboard/stats')
  async getStats(@Request() req) {
    // Đã có trong CourseService
    return this.courseService.getTeacherDashboardStats(req.user.sub);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCourseDto) {
    return this.courseService.createDraft(req.user.sub, dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req) {
    return this.courseService.getCourseDetailWithFullContent(id, req.user.sub);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courseService.updateCourse(id, dto, req.user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.courseService.deleteCourse(id, req.user.sub);
  }

  @Patch(':id/submit')
  async submit(@Param('id') id: string, @Request() req) {
    return this.courseService.submitCourse(id, req.user.sub);
  }

  @Get(':id/builder')
  async getBuilder(@Param('id') id: string, @Request() req) {
    return this.courseService.getCourseDetailWithFullContent(id, req.user.sub);
  }

  @Post(':id/sections')
  async addSection(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: CreateSectionDto,
  ) {
    return this.courseService.addSection(courseId, dto, req.user.sub);
  }

  @Patch(':id/sections/:sectionId')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: { title: string },
    @Request() req,
  ) {
    return this.courseService.updateSection(sectionId, dto.title, req.user.sub);
  }

  @Delete(':id/sections/:sectionId')
  async deleteSection(@Param('sectionId') sectionId: string, @Request() req) {
    return this.courseService.deleteSection(sectionId, req.user.sub);
  }

  @Patch(':id/sections/reorder')
  async reorderSections(
    @Param('id') courseId: string,
    @Body() dto: ReorderSectionsDto,
    @Request() req,
  ) {
    return this.courseService.reorderSections(courseId, dto, req.user.sub);
  }

  @Post(':id/sections/:sectionId/lessons')
  async addLesson(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
    @Request() req,
  ) {
    return this.courseService.addLesson(sectionId, dto, req.user.sub);
  }

  @Delete(':id/lessons/:lessonId')
  async deleteLesson(@Param('lessonId') lessonId: string, @Request() req) {
    return this.courseService.deleteLesson(lessonId, req.user.sub);
  }

  @Get(':id/lessons/:lessonId')
  async getLesson(@Param('lessonId') lessonId: string, @Request() req) {
    return this.courseService.getLessonById(lessonId, req.user.sub);
  }

  @Patch(':id/lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonContentDto,
    @Request() req,
  ) {
    return this.courseService.updateLessonContent(lessonId, dto, req.user.sub);
  }

  @Get(':id/students')
  async getCourseStudents(@Param('id') courseId: string, @Request() req) {
    return this.courseService.getCourseStudents(courseId, req.user.sub);
  }

  @Patch(':id/outcomes')
  async updateOutcomes(
    @Param('id') courseId: string,
    @Body() dto: { outcomes: string[] },
    @Request() req,
  ) {
    return this.courseService.updateOutcomes(
      courseId,
      dto.outcomes,
      req.user.sub,
    );
  }
}
