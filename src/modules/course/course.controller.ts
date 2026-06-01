import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Param,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Giả định bạn đã có Guard này
import { CourseOwnershipGuard } from './guards/course-ownership.guard';

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
}
