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
    const user = request.user;
    if (!user) return false;

    const courseId = request.params.id || request.params.courseId;
    if (!courseId) return true;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.instructorId !== user.sub) {
      throw new ForbiddenException(
        'Bạn không có quyền tác động lên khóa học này',
      );
    }
    return true;
  }
}
