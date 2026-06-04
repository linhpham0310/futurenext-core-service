import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class LxService {
  constructor(private prisma: PrismaService) {}
  async getLessonContent(lessonId: string, userId: string) {
    // ---------------------------------------------------------
    // TASK: LX-BE-1.2: Trả về nội dung sau khi đã pass Guard
    // ---------------------------------------------------------
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    // Lấy thêm tiến độ học tập của user cho bài học này (LX-BE-1.1)
    const progress = await this.prisma.learningProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
    return {
      ...lesson,
      userProgress: progress || { status: 'NOT_STARTED', lastPosition: 0 },
    };
  }
}
