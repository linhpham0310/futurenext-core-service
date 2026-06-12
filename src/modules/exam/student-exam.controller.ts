import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ExamService } from './exam.service';
import { PrismaService } from 'prisma/prisma.service';

@Controller('student/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentExamController {
  constructor(
    private examService: ExamService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getMyExams(@Request() req) {
    return this.examService.getExamsByStudent(req.user.sub);
  }

  @Get(':id')
  async getExam(@Param('id') id: string, @Request() req) {
    return this.examService.getExamForStudent(id, req.user.sub);
  }

  @Get(':id/take')
  async takeExam(@Param('id') id: string, @Request() req) {
    const exam = await this.examService.getExamForStudent(id, req.user.sub);
    // Kiểm tra xem đã có kết quả chưa
    const result = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId: id, userId: req.user.sub } },
    });
    if (result) throw new ForbiddenException('Bạn đã hoàn thành bài thi này');
    // Trả về exam kèm startTime (ghi nhận thời gian bắt đầu)
    return { ...exam, startTime: new Date(), status: 'IN_PROGRESS' };
  }

  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { answers: Record<string, string> },
  ) {
    return this.examService.submitExam(id, req.user.sub, body.answers);
  }

  @Get(':id/result')
  async result(@Param('id') id: string, @Request() req) {
    return this.examService.getExamResult(id, req.user.sub);
  }
}
