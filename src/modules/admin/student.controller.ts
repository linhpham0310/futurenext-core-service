import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentService } from './student.service';

@Controller('student')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // Notifications
  @Get('notifications')
  async getNotifications(@Request() req) {
    return this.studentService.getNotifications(req.user.sub);
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.studentService.markNotificationRead(id, req.user.sub);
  }

  // Favorites
  @Get('favorites')
  async getFavorites(@Request() req) {
    return this.studentService.getFavorites(req.user.sub);
  }

  @Post('favorites')
  async addFavorite(@Body('courseId') courseId: string, @Request() req) {
    return this.studentService.addFavorite(req.user.sub, courseId);
  }

  @Delete('favorites/:courseId')
  async removeFavorite(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Request() req,
  ) {
    return this.studentService.removeFavorite(req.user.sub, courseId);
  }

  // Reviews
  @Get('reviews')
  async getMyReviews(@Request() req) {
    return this.studentService.getMyReviews(req.user.sub);
  }

  @Delete('reviews/:id')
  async deleteReview(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.studentService.deleteReview(id, req.user.sub);
  }

  // Exams
  @Get('exams')
  async getAssignedExams(@Request() req) {
    return this.studentService.getAssignedExams(req.user.sub);
  }

  @Get('exams/:id')
  async getExamDetail(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.studentService.getExamDetail(id, req.user.sub);
  }

  @Post('exams/:id/start')
  async startExam(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.studentService.startExam(id, req.user.sub);
  }

  @Post('exams/:id/submit')
  async submitExam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('answers') answers: any,
    @Request() req,
  ) {
    return this.studentService.submitExam(id, req.user.sub, answers);
  }

  @Get('exams/:id/result')
  async getExamResult(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.studentService.getExamResult(id, req.user.sub);
  }

  // AI assistant
  @Post('ai/ask')
  async askAi(
    @Body('lessonId') lessonId: string,
    @Body('question') question: string,
    @Request() req,
  ) {
    return this.studentService.askAi(req.user.sub, lessonId, question);
  }

  // Change password
  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.studentService.changePassword(req.user.sub, body);
  }
}
