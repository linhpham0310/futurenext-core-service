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
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Giả định bạn đã có Guard này
import { CourseOwnershipGuard } from './guards/course-ownership.guard';
import { CreateSectionDto } from './dto/create-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonContentDto } from './dto/update-lesson-content.dto';
import { UpdateOutcomesDto } from './dto/update-outcomes.dto';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { ProcessReviewDto } from './dto/process-review.dto';
import { UserRole } from '../users/entities/user.entity';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(JwtAuthGuard) // Bảo mật: Chỉ người dùng đăng nhập mới được tạo
  @Post('draft')
  async createDraft(@Request() req, @Body() dto: CreateCourseDto) {
    // Lấy ID người dùng từ Token đã decode qua JwtAuthGuard
    const instructorId = req.user.id;
    return this.courseService.createDraft(instructorId, dto);
  }

  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id')
  async updateCourse(
    @Param('id') id: string,
    @Body() updateData: any, // Nên thay bằng UpdateCourseDto sau này
  ) {
    // Nếu code chạy đến đây, nghĩa là Guard đã xác nhận ID này thuộc về User đang login
    return this.courseService.update(id, updateData);
  }

  // TASK S2-CM-01: API thêm chương mục vào khóa học
  // URL: POST /api/v1/courses/:id/sections
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard) // Bảo vệ chống IDOR từ Task 1.4
  @Post(':id/sections')
  async addSection(
    @Param('id') courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.courseService.addSection(courseId, dto);
  }

  // TASK S2-CM-02: API sắp xếp lại thứ tự các chương mục
  // URL: PATCH /api/v1/courses/:id/sections/reorder
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard) // Tái sử dụng Guard bảo mật từ Sprint 1
  @Patch(':id/sections/reorder')
  async reorderSections(
    @Param('id') courseId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.courseService.reorderSections(courseId, dto);
  }
  // TASK S3-CM-01: API thêm bài học vào một chương mục
  // URL: POST /api/v1/courses/:id/sections/:sectionId/lessons
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Post(':id/sections/:sectionId/lessons')
  async addLesson(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.courseService.addLesson(sectionId, dto);
  }

  // TASK S3-CM-02: API lấy URL Upload Media
  // URL: GET /api/v1/courses/:id/upload-url?fileName=video.mp4&fileType=video/mp4
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard) // Rất quan trọng: Check quyền sở hữu khóa học
  @Get(':id/upload-url')
  async getUploadUrl(
    @Param('id') courseId: string,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string,
  ) {
    return this.courseService.getUploadPresignedUrl(
      courseId,
      fileName,
      fileType,
    );
  }

  /**
   * TASK S3-CM-03: API CẬP NHẬT NỘI DUNG BÀI HỌC
   * URL: PATCH /api/v1/courses/:id/lessons/:lessonId
   */
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard)
  @Patch(':id/lessons/:lessonId')
  async updateLessonContent(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonContentDto,
  ) {
    return this.courseService.updateLessonContent(lessonId, dto);
  }

  /**
   * TASK S4-CM-01: API CẬP NHẬT LEARNING OUTCOMES
   * URL: PATCH /api/v1/courses/:id/outcomes
   */
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard) // (REUSE S1-CM-04 Guard)
  @Patch(':id/outcomes')
  async updateOutcomes(
    @Param('id') courseId: string,
    @Body() dto: UpdateOutcomesDto,
  ) {
    return this.courseService.updateOutcomes(courseId, dto);
  }

  /**
   * TASK S4-CM-02: API GỬI KHÓA HỌC ĐỂ PHÊ DUYỆT
   * URL: POST /api/v1/courses/:id/submit
   */
  @UseGuards(JwtAuthGuard, CourseOwnershipGuard) // (REUSE S1-CM-04: Đảm bảo chính chủ mới được gửi)
  @Post(':id/submit')
  async submitCourse(@Param('id') courseId: string) {
    return this.courseService.submitCourse(courseId);
  }
  /**
   * TASK S4-CM-03: API ADMIN PHÊ DUYỆT KHÓA HỌC
   * URL: PATCH /api/v1/courses/:id/review
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as UserRole) // Chỉ Admin mới có quyền truy cập route này
  @Patch(':id/review')
  async processReview(
    @Param('id') courseId: string,
    @Request() req,
    @Body() dto: ProcessReviewDto,
  ) {
    const adminId = req.user.id;
    return this.courseService.processReview(courseId, adminId, dto);
  }
}
