import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
  Get,
  Query,
} from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CourseService } from '../course.service';
import { UserRole } from '@/modules/users/entities/user.entity';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonContentDto } from '../dto/update-lesson-content.dto';
import { SupabaseStorageService } from '@/modules/storage/supabase-storage.service';
import { CourseOwnershipGuard } from '../guards/course-ownership.guard';
import { UpdateOutcomesDto } from '../dto/update-outcomes.dto';
import { ProcessReviewDto } from '../dto/process-review.dto';
import { UpdateLessonMetadataDto } from '../dto/update-lesson-metadata.dto';

@Controller('courses')
export class CourseController {
  [x: string]: any;
  constructor(
    private readonly courseService: CourseService,
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('draft')
  async createDraft(@Request() req, @Body() dto: CreateCourseDto) {
    const instructorId = req.user.sub;
    return this.courseService.createDraft(instructorId, dto);
  }

  @Get()
  async findAllPublished(@Query() query: any) {
    return this.courseService.findAllPublished(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-courses')
  async getMyCourses(@Request() req) {
    return this.courseService.getMyCourses(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('my-enrolled')
  async getMyEnrolledCourses(@Request() req) {
    return this.courseService.getEnrolledCourses(req.user.sub);
  }

  @Get('public')
  async findAllPublic(@Query() query: any) {
    return this.courseService.findAllPublished(query);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id')
  async updateCourse(@Param('id') id: string, @Body() updateData: any) {
    return this.courseService.update(id, updateData);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/builder')
  async getCourseBuilder(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Post(':id/sections')
  async addSection(
    @Param('id') courseId: string,
    @Body() dto: CreateSectionDto,
    @Request() req,
  ) {
    return this.courseService.addSection(courseId, dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/sections/:sectionId')
  async updateSection(
    @Param('id') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: { title: string },
    @Request() req,
  ) {
    return this.courseService.updateSection(sectionId, dto.title, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/sections/reorder')
  async reorderSections(
    @Param('id') courseId: string,
    @Body() dto: ReorderSectionsDto,
    @Request() req,
  ) {
    return this.courseService.reorderSections(courseId, dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Post(':id/sections/:sectionId/lessons')
  async addLesson(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
    @Request() req,
  ) {
    return this.courseService.addLesson(sectionId, dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/upload-url')
  async getUploadUrl(
    @Param('id') courseId: string,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    return this.storage.createSignedUploadUrl(courseId, fileName);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/lessons/:lessonId')
  async getLesson(@Param('lessonId') lessonId: string, @Request() req) {
    return this.courseService.getLessonById(lessonId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/lessons/:lessonId')
  async updateLessonContent(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonContentDto,
    @Request() req,
  ) {
    return this.courseService.updateLessonContent(lessonId, dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/lessons/:lessonId/metadata')
  async updateMetadata(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonMetadataDto,
  ) {
    return this.courseService.updateLessonMetadata(lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/outcomes')
  async updateOutcomes(
    @Param('id') courseId: string,
    @Body() dto: UpdateOutcomesDto,
  ) {
    return this.courseService.updateOutcomes(courseId, dto);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Post(':id/submit')
  async submitCourse(@Param('id') courseId: string) {
    return this.courseService.submitCourse(courseId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as UserRole)
  @Patch(':id/review')
  async processReview(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: ProcessReviewDto,
  ) {
    const adminId = req.user.sub;
    return this.courseService.processReview(courseId, adminId, dto);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/sections')
  async getSections(@Param('id') courseId: string) {
    return this.courseService.getSections(courseId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as UserRole)
  @Get(':id/admin-detail')
  async getAdminDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post(':id/enroll')
  async enrollCourse(@Param('id') courseId: string, @Request() req) {
    return this.courseService.enrollCourse(req.user.sub, courseId);
  }

  @Get('public/:id')
  async getPublicCourseDetail(@Param('id') id: string, @Request() req) {
    const userId = req.user?.sub;
    return this.courseService.findOnePublishedWithEnrollmentStatus(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get('teacher/students')
  async getTeacherStudents(@Query() query: any, @Request() req) {
    return this.courseService.getTeacherStudents(req.user.sub, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get('teacher/courses/:courseId/students')
  async getCourseStudents(@Param('courseId') courseId: string, @Request() req) {
    return this.courseService.getCourseStudents(req.user.sub, courseId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get('teacher/dashboard/stats')
  async getTeacherDashboardStats(@Request() req) {
    return this.courseService.getTeacherDashboardStats(req.user.sub);
  }

  @Get(':id')
  async findOnePublished(@Param('id') id: string) {
    return this.courseService.findOnePublished(id);
  }
}
