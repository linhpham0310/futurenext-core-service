import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ExamService } from './exam.service';

@Controller('teacher/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherExamController {
  constructor(private examService: ExamService) {}

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
    const exam = await this.examService.getExamForStudent(id, req.user.sub); // teacher cũng có thể xem
    return exam;
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
    return this.examService.publishExam(id, req.user.sub, body.courseId);
  }

  @Get(':id/results')
  async getResults(@Param('id') id: string, @Request() req) {
    return this.examService.getExamResultsForTeacher(id, req.user.sub);
  }
}
