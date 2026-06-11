import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { LogAiInteractionDto } from './dto/log-ai-interaction.dto';
import { IngestLessonContextDto } from './dto/ingest-lesson-context.dto';
import { AiAskDto } from './dto/ai-ask.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

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

  /**
   * TASK: LX-AI-1.2 (SPRINT 1) - Nạp ngữ cảnh bài học (Knowledge Ingestion)
   * Xóa các context cũ và đồng bộ danh sách phân đoạn kiến thức mới phục vụ RAG
   */
  async ingestLessonContext(lessonId: string, dto: IngestLessonContextDto) {
    // Sử dụng $transaction để đảm bảo tính toàn vẹn dữ liệu khi làm mới dữ liệu
    return this.prisma.$transaction(async (tx) => {
      // 1. Dọn dẹp sạch các chunk cũ của bài học này nếu có
      await tx.lxLessonContext.deleteMany({
        where: { lessonId },
      });
      // 2. Chuyển đổi dữ liệu nạp hàng loạt
      const recordsToCreate = dto.chunks.map((chunk) => ({
        lessonId: lessonId,
        chunkIndex: chunk.chunkIndex,
        contentChunk: chunk.contentChunk,
        metadata: chunk.metadata || {},
      }));
      // 3. Thực thi lưu trữ hàng loạt vào DB
      return tx.lxLessonContext.createMany({
        data: recordsToCreate,
      });
    });
  }
  /**
   * TASK: LX-AI-1.2 (SPRINT 1) - API nội bộ phục vụ RAG Service ở Sprint 3
   * Lấy nhanh toàn bộ text chunks liên quan đến bài học
   */
  async getLessonContextsForRag(lessonId: string) {
    return this.prisma.lxLessonContext.findMany({
      where: { lessonId },
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        contentChunk: true,
        metadata: true,
      },
    });
  }

  async submitExam(userId: string, examId: string, dto: SubmitExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // Kiểm tra student có được gán exam này không (thông qua course)
    const enrollment = await this.prisma.purchase.findFirst({
      where: { userId, courseId: exam.courseId },
    });
    if (!enrollment)
      throw new ForbiddenException('Bạn không có quyền làm bài thi này');

    let score = 0;
    const details = [];
    for (const q of exam.questions) {
      const userAnswer = dto.answers[q.id];
      let isCorrect = false;
      if (q.type === 'MCQ' && userAnswer === q.correctAnswer) {
        isCorrect = true;
        score += 1;
      }
      details.push({
        questionId: q.id,
        questionText: q.text,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.type === 'MCQ' ? isCorrect : null,
      });
    }

    const result = await this.prisma.examResult.create({
      data: {
        examId,
        userId,
        score: exam.type === 'ESSAY' ? null : score,
        totalQuestions: exam.questions.length,
        answers: dto.answers,
        submittedAt: new Date(),
      },
    });
    return { result, details };
  }

  // Thêm vào lx.service.ts

  async getRuntimeOverview(courseId: string, userId: string) {
    // Kiểm tra quyền: đã mua khóa học chưa
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    await this.ensureProgressInitialized(courseId, userId);
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
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException();
    const userProgress = await this.prisma.learningProgress.findMany({
      where: { userId, courseId },
    });
    const progressMap = new Map(userProgress.map((p) => [p.lessonId, p]));
    const sectionsWithProgress = course.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        status: progressMap.get(lesson.id)?.status || 'NOT_STARTED',
      })),
    }));
    const totalLessons = sectionsWithProgress.reduce(
      (acc, s) => acc + s.lessons.length,
      0,
    );
    const completedLessons = userProgress.filter(
      (p) => p.status === 'COMPLETED',
    ).length;
    const progressPercentage =
      totalLessons === 0 ? 0 : (completedLessons / totalLessons) * 100;
    return {
      courseId: course.id,
      courseTitle: course.title,
      progressPercentage,
      sections: sectionsWithProgress,
    };
  }

  async getLessonDetail(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException();
    // Kiểm tra quyền (free preview hoặc đã mua)
    if (!lesson.isFreePreview) {
      const purchase = await this.prisma.purchase.findUnique({
        where: { userId_courseId: { userId, courseId: lesson.courseId } },
      });
      if (!purchase) throw new ForbiddenException();
    }
    let progress = await this.prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
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
    return {
      ...lesson,
      userProgress: {
        status: progress.status,
        lastPosition: progress.lastPosition,
        score: progress.score,
        metadata: progress.metadata,
      },
    };
  }

  async updateProgress(
    userId: string,
    lessonId: string,
    dto: UpdateProgressDto,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException();
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
    });
    if (!purchase) throw new ForbiddenException();
    const progress = await this.prisma.learningProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        status: dto.status,
        lastPosition: dto.lastPosition ?? undefined,
        completedAt: dto.status === 'COMPLETED' ? new Date() : undefined,
      },
      create: {
        userId,
        lessonId,
        courseId: lesson.courseId,
        status: dto.status,
        lastPosition: dto.lastPosition || 0,
      },
    });
    return progress;
  }

  async askAi(userId: string, dto: AiAskDto) {
    let context = '';
    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        select: { title: true, content: true, aiMetadata: true },
      });
      if (lesson) {
        context = `Bài học: ${lesson.title}\nNội dung: ${lesson.content?.substring(0, 500)}...\nMetadata: ${JSON.stringify(lesson.aiMetadata)}`;
      }
    }

    const mockAnswer = `[AI] Dựa trên ngữ cảnh: ${context.substring(0, 100)}...\nCâu trả lời cho: "${dto.question}"`;
    await this.prisma.aIInteraction.create({
      data: {
        userId,
        lessonId: dto.lessonId,
        interactionType: 'CHAT',
        prompt: dto.question,
        response: mockAnswer,
        contextSnapshot: { context },
      },
    });
    return { answer: mockAnswer };
  }
}
