import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { PublishExamDto } from './dto/publish-exam.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  // ==================== TEACHER ====================
  async getExamsByTeacher(teacherId: string) {
    return this.prisma.exam.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createExam(teacherId: string, dto: CreateExamDto) {
    // Gộp dữ liệu: teacherId và questions (lưu dưới dạng JSON)
    const data: any = {
      title: dto.title,
      topic: dto.topic,
      type: dto.type,
      duration: dto.duration,
      teacherId,
      questions: dto.questions,
    };
    return this.prisma.exam.create({ data });
  }

  async getExamById(examId: string, teacherId?: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true }, // nếu có model riêng
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    if (teacherId && exam.teacherId !== teacherId)
      throw new ForbiddenException('Bạn không có quyền xem đề thi này');
    return exam;
  }

  async updateExam(examId: string, teacherId: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException();
    if (exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.update({
      where: { id: examId },
      data: dto,
    });
  }

  async deleteExam(examId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException();
    if (exam.teacherId !== teacherId) throw new ForbiddenException();
    // Xoá kết quả thi trước (nếu có ràng buộc)
    await this.prisma.examResult.deleteMany({ where: { examId } });
    return this.prisma.exam.delete({ where: { id: examId } });
  }

  async publishExam(examId: string, teacherId: string, dto: PublishExamDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    // Kiểm tra khoá học tồn tại và thuộc về giáo viên
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instructorId: teacherId },
    });
    if (!course) throw new ForbiddenException('Khóa học không hợp lệ');
    return this.prisma.exam.update({
      where: { id: examId },
      data: { courseId: dto.courseId, isPublished: true },
    });
  }

  async getExamResultsForTeacher(examId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        results: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
    });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    return {
      examTitle: exam.title,
      results: exam.results.map((r) => ({
        studentId: r.userId,
        studentName: r.user.fullName,
        email: r.user.email,
        score: r.score,
        submittedAt: r.submittedAt,
        status: 'COMPLETED',
      })),
    };
  }

  // ==================== STUDENT ====================
  async getExamsByStudent(studentId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId: studentId, status: 'COMPLETED' },
      select: { courseId: true },
    });
    const courseIds = purchases.map((p) => p.courseId);
    const exams = await this.prisma.exam.findMany({
      where: { courseId: { in: courseIds }, isPublished: true },
      include: { course: { select: { title: true } } },
    });
    const results = await this.prisma.examResult.findMany({
      where: { userId: studentId, examId: { in: exams.map((e) => e.id) } },
    });
    return exams.map((exam) => ({
      ...exam,
      status: results.find((r) => r.examId === exam.id)
        ? 'COMPLETED'
        : 'NOT_STARTED',
      score: results.find((r) => r.examId === exam.id)?.score || null,
    }));
  }

  async getExamForStudent(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isPublished: true },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    if (exam.courseId) {
      const purchase = await this.prisma.purchase.findUnique({
        where: {
          userId_courseId: { userId: studentId, courseId: exam.courseId },
        },
      });
      if (!purchase) throw new ForbiddenException('Bạn chưa mua khóa học này');
    }
    return exam;
  }

  async submitExam(
    examId: string,
    studentId: string,
    answers: Record<string, string>,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException();
    const existing = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId, userId: studentId } },
    });
    if (existing) throw new BadRequestException('Bạn đã nộp bài trước đó');

    let score: number | null = null;
    // Tính điểm cho MCQ
    if (exam.type === 'MCQ') {
      let correct = 0;
      for (const q of exam.questions as any[]) {
        if (answers[q.id] === q.correctAnswer) correct++;
      }
      score = correct;
    }
    // Có thể lưu từng câu trả lời chi tiết
    return this.prisma.examResult.create({
      data: {
        examId,
        userId: studentId,
        score,
        totalQuestions: (exam.questions as any[]).length,
        answers,
        submittedAt: new Date(),
      },
    });
  }

  async getExamResult(examId: string, studentId: string) {
    const result = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId, userId: studentId } },
    });
    if (!result) throw new NotFoundException('Bạn chưa làm bài thi này');
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    const questions = exam.questions as any[];
    const details = questions.map((q) => ({
      questionText: q.text,
      userAnswer: result.answers[q.id],
      correctAnswer: q.correctAnswer,
      isCorrect: result.answers[q.id] === q.correctAnswer,
      explanation: q.explanation,
    }));
    return {
      score: result.score,
      totalQuestions: result.totalQuestions,
      correctCount: result.score || 0,
      wrongCount: (result.totalQuestions || 0) - (result.score || 0),
      details,
    };
  }

  // ==================== AI GENERATION ====================
  async generateQuestionsByAI(
    topic: string,
    type: string,
    numQuestions: number,
  ) {
    // TODO: gọi AI thực tế (OpenAI, Gemini, ...)
    const questions: any[] = [];
    for (let i = 0; i < numQuestions; i++) {
      questions.push({
        id: `temp_${i + 1}`,
        text: `Câu hỏi mẫu về ${topic} - số ${i + 1}`,
        type: type === 'ESSAY' ? 'ESSAY' : 'MCQ',
        options:
          type !== 'ESSAY'
            ? ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']
            : undefined,
        correctAnswer: type !== 'ESSAY' ? 'A' : undefined,
        explanation: 'Giải thích mẫu',
      });
    }
    return questions;
  }

  async generateQuiz(dto: GenerateQuizDto) {
    // Tạm thời trả về câu hỏi mẫu
    const questions: any[] = [];
    for (let i = 0; i < dto.numQuestions; i++) {
      questions.push({
        question_text: `Câu hỏi mức độ ${dto.difficulty}: ${dto.content.substring(0, 30)}...`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option A',
        explanation: `Đây là giải thích cho câu hỏi số ${i + 1}`,
      });
    }
    return questions;
  }
}
