import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TeacherService } from './teacher.service';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  // Dashboard
  @Get('dashboard/stats')
  async getStats(@Request() req) {
    return this.teacherService.getStats(req.user.sub);
  }

  // Courses (giảng viên chỉ thấy khóa học của mình)
  @Get('courses')
  async getMyCourses(@Request() req) {
    return this.teacherService.getMyCourses(req.user.sub);
  }

  @Get('courses/:id')
  async getCourse(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.teacherService.getCourse(id, req.user.sub);
  }

  @Get('courses/:id/students')
  async getCourseStudents(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.teacherService.getCourseStudents(id, req.user.sub);
  }

  @Get('courses/:id/builder')
  async getCourseBuilder(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.teacherService.getCourseBuilder(id, req.user.sub);
  }

  // Students of teacher
  @Get('students')
  async getStudents(@Request() req, @Query() query: any) {
    return this.teacherService.getStudents(req.user.sub, query);
  }

  // Revenue
  @Get('revenue/stats')
  async getRevenueStats(@Request() req) {
    return this.teacherService.getRevenueStats(req.user.sub);
  }

  @Get('revenue/transactions')
  async getTransactions(@Request() req, @Query('limit') limit = 20) {
    return this.teacherService.getTransactions(req.user.sub, +limit);
  }

  // Reports export
  @Get('reports/revenue/export')
  async exportRevenueReport(@Request() req) {
    return this.teacherService.exportRevenueReport(req.user.sub);
  }

  @Get('reports/students/export')
  async exportStudentsReport(@Request() req) {
    return this.teacherService.exportStudentsReport(req.user.sub);
  }

  // Payment settings
  @Get('payment-settings')
  async getPaymentSettings(@Request() req) {
    return this.teacherService.getPaymentSettings(req.user.sub);
  }

  @Put('payment-settings')
  async updatePaymentSettings(@Request() req, @Body() data: any) {
    return this.teacherService.updatePaymentSettings(req.user.sub, data);
  }

  // Announcements
  @Get('announcements')
  async getAnnouncements(@Request() req) {
    return this.teacherService.getAnnouncements(req.user.sub);
  }

  @Post('announcements')
  async createAnnouncement(@Request() req, @Body() data: any) {
    return this.teacherService.createAnnouncement(req.user.sub, data);
  }

  // Certificates
  @Get('certificates')
  async getCertificates(@Request() req) {
    return this.teacherService.getCertificates(req.user.sub);
  }

  // Exams management
  @Get('exams')
  async getExams(@Request() req) {
    return this.teacherService.getExams(req.user.sub);
  }

  @Get('exams/:id')
  async getExam(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.teacherService.getExam(id, req.user.sub);
  }

  @Post('exams')
  async createExam(@Request() req, @Body() data: any) {
    return this.teacherService.createExam(req.user.sub, data);
  }

  @Put('exams/:id')
  async updateExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() data: any,
  ) {
    return this.teacherService.updateExam(id, req.user.sub, data);
  }

  @Delete('exams/:id')
  async deleteExam(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.teacherService.deleteExam(id, req.user.sub);
  }

  @Post('exams/:id/publish')
  async publishExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('courseId') courseId: string,
    @Request() req,
  ) {
    return this.teacherService.publishExam(id, courseId, req.user.sub);
  }

  @Get('exams/:id/results')
  async getExamResults(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.teacherService.getExamResults(id, req.user.sub);
  }

  @Post('generate-quiz')
  async generateQuiz(@Body() data: any) {
    return this.teacherService.generateQuiz(data);
  }

  // Profile & settings
  @Get('profile')
  async getProfile(@Request() req) {
    return this.teacherService.getProfile(req.user.sub);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() data: any) {
    return this.teacherService.updateProfile(req.user.sub, data);
  }

  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.teacherService.changePassword(req.user.sub, body);
  }
}
