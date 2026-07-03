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
  Res,
  HttpCode,
  HttpStatus,
  Ip,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
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
import { AiService } from '@/modules/ai/ai.service';
import { UsersService } from '@/modules/users/services/users.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import { UpdateLessonFullDto } from '../dto/update-lesson-full.dto';

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @Get('public')
  async findAllPublic(@Query() query: any) {
    return this.courseService.findAllPublished(query);
  }

  @Get()
  async findAllPublished(@Query() query: any) {
    return this.courseService.findAllPublished(query);
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

  @Get('public/:id')
  async getPublicCourseDetail(@Param('id') id: string, @Request() req) {
    const userId = req.user?.sub;
    return this.courseService.findOnePublishedWithEnrollmentStatus(id, userId);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Get(':id/builder')
  async getCourseBuilder(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post(':id/enroll')
  async enrollCourse(@Param('id') courseId: string, @Request() req) {
    return this.courseService.enrollCourse(req.user.sub, courseId);
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

  @Get(':id/reviews')
  async getCourseReviews(@Param('id') courseId: string) {
    return this.prisma.review.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id/questions')
  async getCourseQuestions(@Param('id') courseId: string) {
    // Có thể chỉ trả về câu hỏi đã được trả lời hoặc tất cả tùy logic
    return this.prisma.question.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async findOnePublished(@Param('id') id: string) {
    return this.courseService.findOnePublished(id);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id')
  async updateCourse(@Param('id') id: string, @Body() updateData: any) {
    return this.courseService.updateCourse(id, updateData, '');
  }
}

@Controller('teacher/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherCourseController {
  constructor(
    private courseService: CourseService,
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

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

  @Get('students/:studentId')
  async getStudentDetail(
    @Param('studentId') studentId: string,
    @Request() req,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        purchases: {
          where: { course: { instructorId: req.user.sub } },
          include: { course: true },
        },
      },
    });
    if (!student) throw new NotFoundException('Không tìm thấy học viên');
    const courseProgress = await Promise.all(
      student.purchases.map(async (p) => {
        const totalLessons = await this.prisma.lesson.count({
          where: { courseId: p.courseId },
        });
        const completed = await this.prisma.learningProgress.count({
          where: {
            userId: studentId,
            courseId: p.courseId,
            status: 'COMPLETED',
          },
        });
        const lastActive = await this.prisma.learningProgress.findFirst({
          where: { userId: studentId, courseId: p.courseId },
          orderBy: { updatedAt: 'desc' },
        });
        return {
          courseId: p.courseId,
          courseTitle: p.course.title,
          progress: totalLessons
            ? Math.round((completed / totalLessons) * 100)
            : 0,
          lastActiveAt: lastActive?.updatedAt || null,
        };
      }),
    );
    return {
      ...student,
      enrolledAt: student.purchases[0]?.purchasedAt,
      coursesEnrolled: student.purchases.length,
      courseProgress,
    };
  }

  @Get('reports/lessons/:courseId')
  async getLessonProgressReport(
    @Param('courseId') courseId: string,
    @Request() req,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không có quyền xem báo cáo này');
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      include: {
        progress: true,
      },
    });
    const students = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      select: { userId: true },
    });
    const totalStudents = students.length;
    return lessons.map((lesson) => {
      const completed = lesson.progress.filter(
        (p) => p.status === 'COMPLETED',
      ).length;
      const inProgress = lesson.progress.filter(
        (p) => p.status === 'IN_PROGRESS',
      ).length;
      const notStarted = lesson.progress.filter(
        (p) => p.status === 'NOT_STARTED',
      ).length;
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        totalStudents,
        completed,
        inProgress,
        notStarted,
        completionRate: totalStudents
          ? Math.round((completed / totalStudents) * 100)
          : 0,
      };
    });
  }

  @Get('reports/lessons/:courseId/export')
  async exportLessonProgressReport(
    @Param('courseId') courseId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const report = await this.getLessonProgressReport(courseId, req);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Progress Report');
    worksheet.columns = [
      { header: 'Bài học', key: 'lessonTitle', width: 30 },
      { header: 'Tổng học viên', key: 'totalStudents', width: 15 },
      { header: 'Hoàn thành', key: 'completed', width: 15 },
      { header: 'Đang học', key: 'inProgress', width: 15 },
      { header: 'Chưa bắt đầu', key: 'notStarted', width: 15 },
      { header: 'Tỷ lệ hoàn thành', key: 'completionRate', width: 15 },
    ];
    report.forEach((row) => worksheet.addRow(row));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lesson_progress_${courseId}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id/builder')
  async getBuilder(@Param('id') id: string, @Request() req) {
    return this.courseService.getCourseDetailWithFullContent(id, req.user.sub);
  }

  @Get(':id/outcomes')
  async getOutcomes(@Param('id') courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { outcomes: true },
    });
    return course?.outcomes || [];
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

  @Post(':id/outcomes')
  async addOutcome(
    @Param('id') courseId: string,
    @Body('title') title: string,
    @Body('description') description?: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    const outcomes = (course.outcomes as any[]) || [];
    const newOutcome = {
      id: uuidv4(),
      title,
      description,
      createdAt: new Date(),
    };
    outcomes.push(newOutcome);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { outcomes },
    });
    return newOutcome;
  }

  @Delete(':id/outcomes/:outcomeId')
  async deleteOutcome(
    @Param('id') courseId: string,
    @Param('outcomeId') outcomeId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    let outcomes = (course.outcomes as any[]) || [];
    outcomes = outcomes.filter((o) => o.id !== outcomeId);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { outcomes },
    });
    return { success: true };
  }

  @Get(':id/ai-settings')
  async getAiSettings(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
      select: { aiMetadata: true },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');

    const metadata = (course.aiMetadata as any) || {};
    return {
      isAiEnabled: metadata.isAiEnabled ?? true,
      systemPrompt: metadata.systemPrompt || '',
      tone: metadata.tone || 'professional',
      autoGenerateOutline: metadata.autoGenerateOutline || false,
      autoGenerateQuiz: metadata.autoGenerateQuiz || false,
    };
  }

  @Put(':id/ai-settings')
  async updateAiSettings(
    @Param('id') courseId: string,
    @Request() req,
    @Body() settings: any,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');

    await this.prisma.course.update({
      where: { id: courseId },
      data: { aiMetadata: settings },
    });
    return { success: true };
  }

  @Post(':id/ai/generate-outline')
  async generateOutline(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
      select: { title: true, description: true },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');

    const outline = await this.aiService.generateCourseOutline(
      course.title,
      course.description,
    );

    // Xóa sections và lessons cũ
    await this.prisma.section.deleteMany({ where: { courseId } });

    // Tạo mới
    for (const [idx, chap] of outline.entries()) {
      const section = await this.prisma.section.create({
        data: { courseId, title: chap.title, orderIndex: idx + 1 },
      });
      for (const [li, lessonTitle] of (chap.lessons || []).entries()) {
        await this.prisma.lesson.create({
          data: {
            sectionId: section.id,
            courseId,
            title: lessonTitle,
            slug: slugify(lessonTitle, { lower: true, strict: true }),
            type: 'ARTICLE',
            orderIndex: li + 1,
            content: `Nội dung mẫu cho ${lessonTitle}`,
          },
        });
      }
    }
    return { success: true, outline };
  }

  @Get(':id/reviews')
  async getCourseReviews(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    return this.prisma.review.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id/questions')
  async getCourseQuestions(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    return this.prisma.question.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/questions/:questionId/answer')
  async answerQuestion(
    @Param('id') courseId: string,
    @Param('questionId') questionId: string,
    @Request() req,
    @Body('answer') answer: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    const question = await this.prisma.question.findUnique({
      where: { id: questionId, courseId },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    return this.prisma.question.update({
      where: { id: questionId },
      data: { answer, answeredAt: new Date() },
    });
  }

  @Post(':id/certificates')
  async issueCertificate(
    @Param('id') courseId: string,
    @Request() req,
    @Body('studentId') studentId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    // Kiểm tra học viên đã hoàn thành khóa học
    const totalLessons = await this.prisma.lesson.count({
      where: { courseId },
    });
    const completed = await this.prisma.learningProgress.count({
      where: { userId: studentId, courseId, status: 'COMPLETED' },
    });
    if (completed < totalLessons) {
      throw new BadRequestException('Học viên chưa hoàn thành khóa học');
    }
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });
    if (existing) throw new ConflictException('Học viên đã có chứng chỉ này');
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    const certificateUrl = `https://example.com/certificates/${courseId}-${studentId}.pdf`;
    return this.prisma.certificate.create({
      data: {
        userId: studentId,
        courseId,
        studentName: student.fullName,
        courseTitle: course.title,
        certificateUrl,
        issuedAt: new Date(),
      },
    });
  }

  @Get(':id/students')
  async getCourseStudents(@Param('id') courseId: string, @Request() req) {
    return this.courseService.getCourseStudents(req.user.sub, courseId);
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

  @Post(':id/sections/:sectionId/lessons')
  async addLesson(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
    @Request() req,
  ) {
    return this.courseService.addLesson(sectionId, dto, req.user.sub);
  }

  @Delete(':id/sections/:sectionId')
  async deleteSection(@Param('sectionId') sectionId: string, @Request() req) {
    return this.courseService.deleteSection(sectionId, req.user.sub);
  }

  @Get(':id/lessons/:lessonId')
  async getLesson(@Param('lessonId') lessonId: string, @Request() req) {
    return this.courseService.getLessonById(lessonId, req.user.sub);
  }

  @Patch(':id/lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonFullDto,
    @Request() req,
  ) {
    return this.courseService.updateLessonFull(lessonId, dto, req.user.sub);
  }

  @Delete(':id/lessons/:lessonId')
  async deleteLesson(@Param('lessonId') lessonId: string, @Request() req) {
    return this.courseService.deleteLesson(lessonId, req.user.sub);
  }

  @Put(':id/sections/:sectionId/mapping')
  async updateSectionMapping(
    @Param('id') courseId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
    @Body() body: { loIds: string[] },
  ) {
    // Kiểm tra quyền sở hữu khóa học
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course) throw new ForbiddenException('Bạn không có quyền');

    // Lưu mapping vào metadata của section (giả định lưu trong trường metadata JSONB)
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section không tồn tại');

    // Cập nhật metadata với loIds
    const metadata = (section.metadata as any) || {};
    metadata.loMappings = body.loIds;
    return this.prisma.section.update({
      where: { id: sectionId },
      data: { metadata },
    });
  }

  @Patch(':id/submit')
  async submit(@Param('id') id: string) {
    return this.courseService.submitCourse(id);
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
}

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCourseController {
  constructor(
    private courseService: CourseService,
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  @Get()
  async getAllCourses(@Query() query: any) {
    return this.courseService.findAllForAdmin(query);
  }

  @Get(':id/admin-detail')
  async getAdminDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
  }

  @Get(':id/reviews')
  async getCourseReviews(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    return this.prisma.review.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id/questions')
  async getCourseQuestions(@Param('id') courseId: string, @Request() req) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    return this.prisma.question.findMany({
      where: { courseId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/questions/:questionId/answer')
  async answerQuestion(
    @Param('id') courseId: string,
    @Param('questionId') questionId: string,
    @Request() req,
    @Body('answer') answer: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    const question = await this.prisma.question.findUnique({
      where: { id: questionId, courseId },
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    return this.prisma.question.update({
      where: { id: questionId },
      data: { answer, answeredAt: new Date() },
    });
  }

  @Post(':id/certificates')
  async issueCertificate(
    @Param('id') courseId: string,
    @Request() req,
    @Body('studentId') studentId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không phải chủ sở hữu khóa học');
    // Kiểm tra học viên đã hoàn thành khóa học
    const totalLessons = await this.prisma.lesson.count({
      where: { courseId },
    });
    const completed = await this.prisma.learningProgress.count({
      where: { userId: studentId, courseId, status: 'COMPLETED' },
    });
    if (completed < totalLessons) {
      throw new BadRequestException('Học viên chưa hoàn thành khóa học');
    }
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });
    if (existing) throw new ConflictException('Học viên đã có chứng chỉ này');
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    const certificateUrl = `https://example.com/certificates/${courseId}-${studentId}.pdf`;
    return this.prisma.certificate.create({
      data: {
        userId: studentId,
        courseId,
        studentName: student.fullName,
        courseTitle: course.title,
        certificateUrl,
        issuedAt: new Date(),
      },
    });
  }

  @Patch(':id/approve')
  async approveCourse(@Param('id') id: string, @Request() req) {
    return this.courseService.processReview(id, req.user.sub, {
      action: 'APPROVED',
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

  @Patch(':id/review')
  async processReview(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: ProcessReviewDto,
  ) {
    return this.courseService.processReview(courseId, req.user.sub, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async triggerResetPassword(
    @Param('id') userId: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    await this.usersService.triggerResetPassword(userId, req.user.sub, ip);
    return {
      message: 'Link reset mật khẩu đã được gửi đến email của người dùng.',
    };
  }

  @Get(':id/audit-logs')
  async getUserAuditLogs(@Param('id') userId: string) {
    return this.usersService.getUserAuditLogs(userId);
  }

  @Get('reports/lessons/:courseId')
  async getLessonProgressReport(
    @Param('courseId') courseId: string,
    @Request() req,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course)
      throw new ForbiddenException('Bạn không có quyền xem báo cáo này');
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      include: {
        progress: true,
      },
    });
    const students = await this.prisma.purchase.findMany({
      where: { courseId, status: 'COMPLETED' },
      select: { userId: true },
    });
    const totalStudents = students.length;
    return lessons.map((lesson) => {
      const completed = lesson.progress.filter(
        (p) => p.status === 'COMPLETED',
      ).length;
      const inProgress = lesson.progress.filter(
        (p) => p.status === 'IN_PROGRESS',
      ).length;
      const notStarted = lesson.progress.filter(
        (p) => p.status === 'NOT_STARTED',
      ).length;
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        totalStudents,
        completed,
        inProgress,
        notStarted,
        completionRate: totalStudents
          ? Math.round((completed / totalStudents) * 100)
          : 0,
      };
    });
  }

  @Get('reports/lessons/:courseId/export')
  async exportLessonProgressReport(
    @Param('courseId') courseId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const report = await this.getLessonProgressReport(courseId, req);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Progress Report');
    worksheet.columns = [
      { header: 'Bài học', key: 'lessonTitle', width: 30 },
      { header: 'Tổng học viên', key: 'totalStudents', width: 15 },
      { header: 'Hoàn thành', key: 'completed', width: 15 },
      { header: 'Đang học', key: 'inProgress', width: 15 },
      { header: 'Chưa bắt đầu', key: 'notStarted', width: 15 },
      { header: 'Tỷ lệ hoàn thành', key: 'completionRate', width: 15 },
    ];
    report.forEach((row) => worksheet.addRow(row));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=lesson_progress_${courseId}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id')
  async getCourseDetail(@Param('id') id: string) {
    return this.courseService.getCourseDetailWithFullContent(id);
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
}
