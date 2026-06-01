import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class CourseOwnershipGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // 1. Lấy user từ JwtAuthGuard (đã chạy trước đó)
    const user = request.user;
    if (!user) return false;
    // 2. Lấy courseId từ URL Params (ví dụ: /courses/:id/sections)
    const courseId = request.params.id || request.params.courseId;
    if (!courseId) {
      return true; // Nếu route không yêu cầu ID, cho phép đi tiếp hoặc xử lý tùy logic
    }
    // 3. Truy vấn DB kiểm tra quyền sở hữu (Task S1-CM-04)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }
    if (course.instructorId !== user.id) {
      // Chặn lỗi IDOR tại đây
      throw new ForbiddenException(
        'Bạn không có quyền tác động lên khóa học này',
      );
    }
    return true;
  }
}
