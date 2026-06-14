import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CourseEntitlementGuard } from './guards/course-entitlement.guard';
import { LxService } from './lx.service';
import { LogAiInteractionDto } from './dto/log-ai-interaction.dto';
import { IngestLessonContextDto } from './dto/ingest-lesson-context.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { AiAskDto } from './dto/ai-ask.dto';

@Controller('lx')
export class LxController {
  constructor(private readonly lxService: LxService) {}

  @UseGuards(JwtAuthGuard)
  @Get('runtime/:courseId')
  async getRuntime(@Param('courseId') courseId: string, @Request() req) {
    return this.lxService.getRuntimeOverview(courseId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, CourseEntitlementGuard)
  @Get('lesson/:id')
  async getLessonContent(@Param('id') id: string, @Request() req) {
    return this.lxService.getLessonContent(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai/test-log')
  async testAiLog(@Request() req, @Body() dto: LogAiInteractionDto) {
    return this.lxService.logAiInteraction(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post('lessons/:lessonId/contexts')
  async ingestContext(
    @Param('lessonId') lessonId: string,
    @Body() dto: IngestLessonContextDto,
  ) {
    return this.lxService.ingestLessonContext(lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Get('lessons/:lessonId/contexts')
  async getContexts(@Param('lessonId') lessonId: string) {
    return this.lxService.getLessonContextsForRag(lessonId);
  }

  @UseGuards(JwtAuthGuard, CourseEntitlementGuard)
  @Patch('lessons/:lessonId/progress')
  async updateProgress(
    @Param('lessonId') lessonId: string,
    @Request() req,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.lxService.updateProgress(req.user.sub, lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, CourseEntitlementGuard)
  @Post('exams/:examId/submit')
  async submitExam(
    @Param('examId') examId: string,
    @Request() req,
    @Body() dto: SubmitExamDto,
  ) {
    return this.lxService.submitExam(req.user.sub, examId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ai/ask')
  async askAi(@Request() req, @Body() dto: AiAskDto) {
    return this.lxService.askAi(req.user.sub, dto);
  }
}
