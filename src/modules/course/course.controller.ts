import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Giả định bạn đã có Guard này
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
}
