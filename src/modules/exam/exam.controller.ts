// src/modules/exam/exam.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ExamService } from './exam.service';
import { PrismaService } from '../../../prisma/prisma.service'; // sửa đường dẫn

// ==================== STUDENT ====================
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
    const result = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId: id, userId: req.user.sub } },
    });
    if (result) throw new ForbiddenException('Bạn đã hoàn thành bài thi này');
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

// ==================== TEACHER ====================
@Controller('teacher/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherExamController {
  constructor(
    private examService: ExamService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getMyExams(@Request() req) {
    return this.examService.getExamsByTeacher(req.user.sub);
  }

  @Post('generate')
  async generate(
    @Body()
    body: {
      topic: string;
      type: string;
      duration: number;
      numQuestions: number;
    },
  ) {
    const questions = await this.examService.generateQuestionsByAI(
      body.topic,
      body.type,
      body.numQuestions,
    );
    return { questions };
  }

  @Post()
  async create(@Request() req, @Body() data: any) {
    return this.examService.createExam(req.user.sub, data);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req) {
    return this.examService.getExamById(id, req.user.sub);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() data: any) {
    return this.examService.updateExam(id, req.user.sub, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.examService.deleteExam(id, req.user.sub);
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { courseId: string },
  ) {
    return this.examService.publishExam(id, req.user.sub, {
      courseId: body.courseId,
    });
  }

  @Get(':id/results')
  async getResults(@Param('id') id: string, @Request() req) {
    return this.examService.getExamResultsForTeacher(id, req.user.sub);
  }

  @Post(':id/from-bank')
  async addQuestionsFromBank(
    @Param('id') examId: string,
    @Request() req,
    @Body('questionIds') questionIds: string[], // mảng ID câu hỏi trong bank
  ) {
    // 1. Kiểm tra exam thuộc teacher
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId, teacherId: req.user.sub },
    });
    if (!exam) throw new ForbiddenException();

    // 2. Lấy câu hỏi từ bank (kiểm tra quyền sở hữu)
    const bankItems = await this.prisma.questionBankItem.findMany({
      where: {
        id: { in: questionIds },
        bank: { teacherId: req.user.sub },
      },
    });

    // 3. Chuyển đổi thành ExamQuestion và thêm vào exam
    const examQuestions = bankItems.map((item, index) => ({
      examId,
      text: item.questionText,
      type: item.type,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      orderIndex: index + 1,
    }));

    await this.prisma.examQuestion.createMany({
      data: examQuestions,
    });

    return { message: `Đã thêm ${examQuestions.length} câu hỏi vào đề thi` };
  }
}
