import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Put,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { ExamService } from './exam.service';
import {
  CreateExamDto,
  PublishExamDto,
  UpdateExamDto,
} from './dto/create-exam.dto';
import { UserRole } from '../users/entities/user.entity';

@Controller('exams')
export class ExamController {
  constructor(private examService: ExamService) {}

  // ---------- Teacher endpoints ----------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Post()
  async createExam(@Request() req, @Body() dto: CreateExamDto) {
    return this.examService.create(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get()
  async getMyExams(@Request() req, @Query() query) {
    return this.examService.findAllByTeacher(req.user.sub, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get(':id')
  async getExam(@Param('id') id: string, @Request() req) {
    return this.examService.findOne(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Put(':id')
  async updateExam(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.update(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Delete(':id')
  async deleteExam(@Param('id') id: string, @Request() req) {
    return this.examService.delete(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Post('generate')
  async generateQuiz(@Body() dto: GenerateQuizDto) {
    return this.examService.generateQuiz(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Post(':id/publish')
  async publishExam(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: PublishExamDto,
  ) {
    return this.examService.publish(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get(':id/results')
  async getResults(@Param('id') id: string, @Request() req) {
    return this.examService.getExamResults(req.user.sub, id);
  }

  // ---------- Student endpoints ----------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('student/assigned')
  async getAssignedExams(@Request() req) {
    return this.examService.getAssignedExams(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('student/:id/take')
  async takeExam(@Param('id') id: string, @Request() req) {
    return this.examService.getExamForTaking(req.user.sub, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post('student/:id/submit')
  async submitExam(
    @Param('id') id: string,
    @Request() req,
    @Body('answers') answers: Record<string, string>,
  ) {
    return this.examService.submitExam(req.user.sub, id, answers);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('student/:id/result')
  async getResult(@Param('id') id: string, @Request() req) {
    return this.examService.getExamResult(req.user.sub, id);
  }
}
