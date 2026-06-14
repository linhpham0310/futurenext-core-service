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
    const userId = request.user?.sub;
    const lessonId = request.params.lessonId ?? request.params.id;

    if (!userId || !lessonId) {
      throw new ForbiddenException('Thiếu thông tin xác thực hoặc bài học');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, isFreePreview: true },
    });
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    if (lesson.isFreePreview) {
      return true;
    }

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
