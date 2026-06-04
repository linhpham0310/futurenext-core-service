import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { LogAiInteractionDto } from './dto/log-ai-interaction.dto';

@Injectable()
export class LxService {
  constructor(private prisma: PrismaService) {}

  /**
   * TASK LX-BE-1.5: Logic khởi tạo tiến độ hàng loạt
   * Hàm này đảm bảo mọi bài học trong khóa đều có bản ghi tiến độ cho User
   */
  private async ensureProgressInitialized(courseId: string, userId: string) {
    // 1. Lấy danh sách tất cả LessonId của khóa học này
    const allLessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    // 2. Lấy danh sách LessonId đã có bản ghi tiến độ
    const existingProgress = await this.prisma.learningProgress.findMany({
      where: { userId, courseId },
      select: { lessonId: true },
    });
    const existingLessonIds = new Set(existingProgress.map((p) => p.lessonId));
    // 3. Lọc ra các LessonId chưa có bản ghi tiến độ
    const missingLessonIds = allLessons
      .filter((lesson) => !existingLessonIds.has(lesson.id))
      .map((lesson) => lesson.id);
    // 4. Nếu có bài học thiếu, thực hiện khởi tạo hàng loạt (Bulk Insert)
    if (missingLessonIds.length > 0) {
      const dataToCreate = missingLessonIds.map((lessonId) => ({
        userId,
        courseId,
        lessonId,
        status: 'NOT_STARTED' as const,
      }));
      // Sử dụng createMany để tối ưu hiệu suất (Chỉ chạy trên Postgres)
      await this.prisma.learningProgress.createMany({
        data: dataToCreate,
        skipDuplicates: true, // Đảm bảo an toàn nếu có race condition
      });
    }
  }

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

  /**
   * TASK LX-BE-1.3: Lấy cấu trúc khóa học và tiến độ học viên
   */
  async getRuntimeOverview(courseId: string, userId: string) {
    // 1. Kiểm tra quyền sở hữu khóa học (Entitlement Check)
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });
    if (!purchase) {
      throw new ForbiddenException('Bạn không có quyền truy cập ');
    }

    // ---------------------------------------------------------
    // TASK: LX-BE-1.5: Tự động khởi tạo nếu chưa đủ
    // ---------------------------------------------------------
    await this.ensureProgressInitialized(courseId, userId);

    // 2. Lấy toàn bộ cấu trúc khóa học (Sections & Lessons)
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                isFreePreview: true,
                orderIndex: true,
                // Không lấy field 'content' ở đây để tối ưu tốc độ tải danh sách
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');
    // 3. Lấy danh sách tiến độ của User trong khóa học này (LX-BE-1.1)
    const userProgress = await this.prisma.learningProgress.findMany({
      where: { userId, courseId },
    });
    // 4. Gộp (Merge) cấu trúc và tiến độ
    // Chuyển mảng tiến độ thành Map để tìm kiếm nhanh O(1)
    const progressMap = new Map(userProgress.map((p) => [p.lessonId, p]));
    const sectionsWithProgress = course.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id);
        return {
          ...lesson,
          userProgress: progress || { status: 'NOT_STARTED', lastPosition: 0 },
        };
      }),
    }));
    // 5. Tính toán tổng quan % hoàn thành (Optional nhưng rất hữu ích cho FE)
    const totalLessons = sectionsWithProgress.reduce(
      (acc, s) => acc + s.lessons.length,
      0,
    );
    const completedLessons = userProgress.filter(
      (p) => p.status === 'COMPLETED',
    ).length;
    const progressPercentage =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    return {
      courseId: course.id,
      courseTitle: course.title,
      progressPercentage,
      sections: sectionsWithProgress,
    };
  }

  /**
   * TASK LX-BE-1.4: Lấy chi tiết nội dung bài học và tiến độ cá nhân
   */
  async getLessonDetail(lessonId: string, userId: string) {
    // 1. Lấy thông tin chi tiết bài học
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }
    // 2. Tìm hoặc Tự động khởi tạo tiến độ học tập (Optimistic Initialization)
    // Nếu học viên lần đầu bấm vào bài này, chúng ta tạo luôn bản ghi NOT_STARTED
    let progress = await this.prisma.learningProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
    if (!progress) {
      progress = await this.prisma.learningProgress.create({
        data: {
          userId,
          lessonId,
          courseId: lesson.courseId,
          status: 'NOT_STARTED',
          lastPosition: 0,
        },
      });
    }
    // 3. Trả về object gộp (Sử dụng cho Player/Editor ở Frontend)
    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type, // VIDEO, ARTICLE, QUIZ, LAB
      content: lesson.content, // Đây là lúc chúng ta trả về dữ liệu nặng (Video URL/Markdown)
      duration: lesson.duration,
      metadata: lesson.aiMetadata, // Metadata từ Module Course (S4-CM-05)
      userProgress: {
        status: progress.status,
        lastPosition: progress.lastPosition,
        score: progress.score,
        metadata: progress.metadata,
      },
    };
  }

  /**
   * TASK: LX-AI-1.1 (SPRINT 1): Lưu nhật ký tương tác AI
   * Hàm này sẽ được gọi tập trung từ AI TA Service (Sprint 3) hoặc Lab Service (Sprint 4)
   */
  async logAiInteraction(userId: string, dto: LogAiInteractionDto) {
    // Luôn kiểm tra tính hợp lệ của user_id từ JWT (Mục 6.2 Developer Notes)
    return this.prisma.aIInteraction.create({
      data: {
        userId: userId,
        lessonId: dto.lessonId,
        interactionType: dto.interactionType,
        prompt: dto.prompt,
        response: dto.response,
        contextSnapshot: dto.contextSnapshot || {},
      },
    });
  }
}
