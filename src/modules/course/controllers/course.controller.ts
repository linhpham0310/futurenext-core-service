import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CourseService } from '../course.service';
import { UserRole } from '../../users/entities/user.entity';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateSectionDto } from '../dto/create-section.dto';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonContentDto } from '../dto/update-lesson-content.dto';
import { UpdateLessonMetadataDto } from '../dto/update-lesson-metadata.dto';
import { UpdateOutcomesDto } from '../dto/update-outcomes.dto';
import { ProcessReviewDto } from '../dto/process-review.dto';
import { CourseOwnershipGuard } from '../guards/course-ownership.guard';
import { SupabaseStorageService } from '../../storage/supabase-storage.service';
import { PrismaService } from '../../../../prisma/prisma.service';

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @Get()
  async findAllPublished(@Query() query: any) {
    return this.courseService.findAllPublished(query);
  }

  @Get('public')
  async findAllPublic(@Query() query: any) {
    return this.courseService.findAllPublished(query);
  }

  @Get('public/:id')
  async getPublicCourseDetail(@Param('id') id: string, @Request() req) {
    const userId = req.user?.sub;
    return this.courseService.findOnePublishedWithEnrollmentStatus(id, userId);
  }

  @Get(':id')
  async findOnePublished(@Param('id') id: string) {
    return this.courseService.findOnePublished(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('draft')
  async createDraft(@Request() req, @Body() dto: CreateCourseDto) {
    return this.courseService.createDraft(req.user.sub, dto);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post(':id/enroll')
  async enrollCourse(@Param('id') courseId: string, @Request() req) {
    return this.courseService.enrollCourse(req.user.sub, courseId);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id')
  async updateCourse(@Param('id') id: string, @Body() updateData: any) {
    return this.courseService.updateCourse(id, updateData, '');
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

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/upload-url')
  async getUploadUrl(
    @Param('id') courseId: string,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    return this.courseService.getUploadSignedUrl(courseId, fileName, fileType);
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

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/sections')
  async getSections(@Param('id') courseId: string) {
    return this.courseService.getSections(courseId);
  }
}

@Controller('teacher/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherCourseController {
  constructor(private courseService: CourseService) {}

  @Get()
  async getMyCourses(@Request() req) {
    return this.courseService.getMyCourses(req.user.sub);
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateCourseDto) {
    return this.courseService.createDraft(req.user.sub, dto);
  }

  @Get('dashboard/stats')
  async getStats(@Request() req) {
    return this.courseService.getTeacherDashboardStats(req.user.sub);
  }

  @Get('students')
  async getAllStudents(@Request() req) {
    return this.courseService.getAllStudentsByTeacher(req.user.sub);
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

  @Get(':id/builder')
  async getBuilder(@Param('id') id: string, @Request() req) {
    return this.courseService.getCourseDetailWithFullContent(id, req.user.sub);
  }

  @Patch(':id/submit')
  async submit(@Param('id') id: string) {
    return this.courseService.submitCourse(id);
  }

  @Post(':id/sections')
  async addSection(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: CreateSectionDto,
  ) {
    return this.courseService.addSection(courseId, dto, req.user.sub);
  }

  @Patch(':id/sections/reorder')
  async reorderSections(
    @Param('id') courseId: string,
    @Body() dto: ReorderSectionsDto,
    @Request() req,
  ) {
    return this.courseService.reorderSections(courseId, dto, req.user.sub);
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
    return this.courseService.getCourseStudents(req.user.sub, courseId);
  }

  @Patch(':id/outcomes')
  async updateOutcomes(
    @Param('id') courseId: string,
    @Body() dto: { outcomes: string[] },
    @Request() req,
  ) {
    return this.courseService.updateOutcomes(courseId, {
      outcomes: dto.outcomes,
    });
  }
}

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCourseController {
  constructor(
    private courseService: CourseService,
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
    @Param('id') courseId: string,
    @Body() dto: UpdateCourseDto,
    @Req() req: any,
  ) {
    return this.courseService.updateCourse(courseId, dto, '');
  }

  @Delete(':id')
  async deleteCourse(@Param('id') id: string) {
    return this.courseService.deleteCourse(id, '');
  }

  @Get(':id/admin-detail')
  async getAdminDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @Patch(':id/review')
  async processReview(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: ProcessReviewDto,
  ) {
    return this.courseService.processReview(courseId, req.user.sub, dto);
  }
}
