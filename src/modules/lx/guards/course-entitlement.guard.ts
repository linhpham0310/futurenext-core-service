import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class CourseEntitlementGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub; // Lấy từ JwtAuthGuard
    const lessonId = request.params.lessonId ?? request.params.id;
    if (!userId || !lessonId) {
      throw new ForbiddenException('Thiếu thông tin xác thực hoặc bài học');
    }
    // ---------------------------------------------------------
    // TASK: LX-BE-1.2: Triển khai Entitlement Guard
    // ---------------------------------------------------------
    // 1. Tìm thông tin bài học và trạng thái Free Preview
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
        isFreePreview: true,
      },
    });
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }
    // 2. Nếu là bài học cho phép xem thử -> Cho qua luôn
    if (lesson.isFreePreview) {
      return true;
    }
    // 3. Nếu không phải xem thử, kiểm tra xem User đã mua khóa học chưa
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: lesson.courseId,
        },
      },
    });
    if (!purchase) {
      throw new ForbiddenException(
        'Bạn chưa đăng ký khóa học này để xem nội dung',
      );
    }
    return true;
  }
}
