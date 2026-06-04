import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Post,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CourseEntitlementGuard } from './guards/course-entitlement.guard';
import { LxService } from './lx.service';
import { LogAiInteractionDto } from './dto/log-ai-interaction.dto';
import { IngestLessonContextDto } from './dto/ingest-lesson-context.dto';
@Controller('lx')
export class LxController {
  constructor(private readonly lxService: LxService) {}
  /**
   * TASK LX-BE-1.3: API lấy lộ trình học tập thực thi (Runtime)
   * GET /api/v1/lx/runtime/:courseId
   */
  @UseGuards(JwtAuthGuard) // Chỉ cần đăng nhập, logic Entitlement đã nằm trong Service
  @Get('runtime/:courseId')
  async getRuntime(@Param('courseId') courseId: string, @Request() req) {
    return this.lxService.getRuntimeOverview(courseId, req.user.id);
  }

  /**
   * TASK LX-BE-1.4: API lấy chi tiết nội dung bài học
   * URL: GET /api/v1/lx/lesson/:id
   */
  @UseGuards(JwtAuthGuard, CourseEntitlementGuard) // Bảo vệ 2 lớp: Login & Mua khóa học
  @Get('lesson/:id')
  async getLesson(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.lxService.getLessonDetail(id, userId);
  }

  // ---------------------------------------------------------
  // TASK: LX-BE-1.2: Áp dụng Guard bảo vệ nội dung bài học
  // ---------------------------------------------------------
  @UseGuards(JwtAuthGuard, CourseEntitlementGuard)
  @Get('lesson/:id')
  async getLessonContent(@Param('id') id: string, @Request() req) {
    return this.lxService.getLessonContent(id, req.user.id);
  }

  /**
   * TASK: LX-AI-1.1 (SPRINT 1): API Test ghi nhật ký AI Interaction
   * URL: POST /api/v1/lx/ai/test-log
   */
  @UseGuards(JwtAuthGuard)
  @Post('ai/test-log')
  async testAiLog(@Request() req, @Body() dto: LogAiInteractionDto) {
    const userId = req.user.id;
    return this.lxService.logAiInteraction(userId, dto);
  }

  /**
   * TASK: LX-AI-1.2 (SPRINT 1) - API đồng bộ tri thức bài học phục vụ AI TA
   * URL: POST /api/v1/lx/lessons/:lessonId/contexts
   */
  @Post('lessons/:lessonId/contexts')
  async ingestContext(
    @Param('lessonId') lessonId: string,
    @Body() dto: IngestLessonContextDto,
  ) {
    return this.lxService.ingestLessonContext(lessonId, dto);
  }
  /**
   * TASK: LX-AI-1.2 (SPRINT 1) - API nội bộ test truy xuất tri thức bài học
   * URL: GET /api/v1/lx/lessons/:lessonId/contexts
   */
  @Get('lessons/:lessonId/contexts')
  async getContexts(@Param('lessonId') lessonId: string) {
    return this.lxService.getLessonContextsForRag(lessonId);
  }
}
