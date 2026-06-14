import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LearningProgress } from '@prisma/client';
import {
  LogAiInteractionDto,
  EInteractionType,
} from './dto/log-ai-interaction.dto';
import { IngestLessonContextDto } from './dto/ingest-lesson-context.dto';
import { AiAskDto } from './dto/ai-ask.dto';
import {
  UpdateProgressDto,
  LessonProgressStatus,
} from './dto/update-progress.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Injectable()
export class LxService {
  constructor(private prisma: PrismaService) {}

  // ==================== PRIVATE HELPERS ====================
  private async ensureProgressInitialized(courseId: string, userId: string) {
    const allLessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const existingProgress = await this.prisma.learningProgress.findMany({
      where: { userId, courseId },
      select: { lessonId: true },
    });
    const existingLessonIds = new Set(existingProgress.map((p) => p.lessonId));
    const missingLessonIds = allLessons
      .filter((lesson) => !existingLessonIds.has(lesson.id))
      .map((lesson) => lesson.id);
    if (missingLessonIds.length > 0) {
      await this.prisma.learningProgress.createMany({
        data: missingLessonIds.map((lessonId) => ({
          userId,
          courseId,
          lessonId,
          status: 'NOT_STARTED' as const,
        })),
        skipDuplicates: true,
      });
    }
  }

  // ==================== LESSON CONTENT & PROGRESS ====================
  async getLessonContent(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    const progress = await this.prisma.learningProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return {
      ...lesson,
      userProgress: progress || { status: 'NOT_STARTED', lastPosition: 0 },
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
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    const progress = await this.prisma.learningProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        status: dto.status,
        lastPosition: dto.lastPosition ?? undefined,
        completedAt:
          dto.status === LessonProgressStatus.COMPLETED
            ? new Date()
            : undefined,
      },
      create: {
        userId,
        lessonId,
        courseId: lesson.courseId,
        status: dto.status,
        lastPosition: dto.lastPosition || 0,
        metadata: dto.metadata || {},
      },
    });
    return progress;
  }

  // ==================== RUNTIME OVERVIEW ====================
  async getRuntimeOverview(courseId: string, userId: string) {
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
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    const userProgress = await this.prisma.learningProgress.findMany({
      where: { userId, courseId },
    });
    const progressMap = new Map<string, LearningProgress>(
      userProgress.map((p) => [p.lessonId, p]),
    );
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
      (p) => p.status === LessonProgressStatus.COMPLETED,
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

  // ==================== AI INTERACTIONS ====================
  async logAiInteraction(userId: string, dto: LogAiInteractionDto) {
    return this.prisma.aIInteraction.create({
      data: {
        userId,
        lessonId: dto.lessonId,
        interactionType: dto.interactionType,
        prompt: dto.prompt,
        response: dto.response,
        contextSnapshot: dto.contextSnapshot || {},
      },
    });
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
        interactionType: EInteractionType.CHAT,
        prompt: dto.question,
        response: mockAnswer,
        contextSnapshot: { context },
      },
    });
    return { answer: mockAnswer };
  }

  // ==================== RAG CONTEXT MANAGEMENT ====================
  async ingestLessonContext(lessonId: string, dto: IngestLessonContextDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.lxLessonContext.deleteMany({ where: { lessonId } });
      const recordsToCreate = dto.chunks.map((chunk) => ({
        lessonId,
        chunkIndex: chunk.chunkIndex,
        contentChunk: chunk.contentChunk,
        metadata: chunk.metadata || {},
      }));
      return tx.lxLessonContext.createMany({ data: recordsToCreate });
    });
  }

  async getLessonContextsForRag(lessonId: string) {
    return this.prisma.lxLessonContext.findMany({
      where: { lessonId },
      orderBy: { chunkIndex: 'asc' },
      select: { chunkIndex: true, contentChunk: true, metadata: true },
    });
  }

  // ==================== EXAM SUBMISSION ====================
  async submitExam(userId: string, examId: string, dto: SubmitExamDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    const enrollment = await this.prisma.purchase.findFirst({
      where: { userId, courseId: exam.courseId },
    });
    if (!enrollment)
      throw new ForbiddenException('Bạn không có quyền làm bài thi này');
    let score = 0;
    const details: any[] = [];
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
}
