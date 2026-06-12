import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  async getExamsByTeacher(teacherId: string) {
    return this.prisma.exam.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createExam(teacherId: string, data: any) {
    return this.prisma.exam.create({ data: { ...data, teacherId } });
  }

  async updateExam(examId: string, teacherId: string, data: any) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.update({ where: { id: examId }, data });
  }

  async deleteExam(examId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.delete({ where: { id: examId } });
  }

  async publishExam(examId: string, teacherId: string, courseId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.update({
      where: { id: examId },
      data: { courseId, isPublished: true },
    });
  }

  async getExamForStudent(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, isPublished: true },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException();
    if (exam.courseId) {
      const purchase = await this.prisma.purchase.findUnique({
        where: {
          userId_courseId: { userId: studentId, courseId: exam.courseId },
        },
      });
      if (!purchase) throw new ForbiddenException();
    }
    return exam;
  }

  async getExamsByStudent(studentId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId: studentId, status: 'COMPLETED' },
      select: { courseId: true },
    });
    const courseIds = purchases.map((p) => p.courseId);
    const exams = await this.prisma.exam.findMany({
      where: { courseId: { in: courseIds }, isPublished: true },
    });
    const results = await this.prisma.examResult.findMany({
      where: { userId: studentId, examId: { in: exams.map((e) => e.id) } },
    });
    return exams.map((exam) => ({
      ...exam,
      status: results.find((r) => r.examId === exam.id)
        ? 'COMPLETED'
        : 'NOT_STARTED',
      score: results.find((r) => r.examId === exam.id)?.score,
    }));
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
    const existing = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId, userId: studentId } },
    });
    if (existing) throw new ForbiddenException('Bạn đã nộp bài rồi');
    let score = null;
    if (exam.type === 'MCQ') {
      const questions = exam.questions as any[];
      let correct = 0;
      for (const q of exam.questions) {
        if (answers[q.id] === q.correctAnswer) correct++;
      }
      score = correct;
    }
    return this.prisma.examResult.create({
      data: {
        examId,
        userId: studentId,
        score,
        totalQuestions: (exam.questions as any[]).length,
        answers,
      },
    });
  }

  async getExamResult(examId: string, studentId: string) {
    const result = await this.prisma.examResult.findUnique({
      where: { examId_userId: { examId, userId: studentId } },
    });
    if (!result) throw new NotFoundException();
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    const questions = exam.questions as any[];
    const details = exam.questions.map((q) => ({
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
      wrongCount: result.totalQuestions - (result.score || 0),
      details,
    };
  }

  async getExamResultsForTeacher(examId: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.teacherId !== teacherId) throw new ForbiddenException();
    const results = await this.prisma.examResult.findMany({
      where: { examId },
      include: { user: { select: { fullName: true, email: true } } },
    });
    return {
      examTitle: exam.title,
      results: results.map((r) => ({
        studentId: r.userId,
        studentName: r.user.fullName,
        email: r.user.email,
        score: r.score,
        submittedAt: r.submittedAt,
        status: 'COMPLETED',
      })),
    };
  }

  async generateQuestionsByAI(
    topic: string,
    type: string,
    numQuestions: number,
  ) {
    // TODO: Gọi AI service
    const questions = [];
    for (let i = 0; i < numQuestions; i++) {
      questions.push({
        id: `q${i}`,
        text: `Câu hỏi mẫu về ${topic} số ${i + 1}`,
        type: type === 'ESSAY' ? 'ESSAY' : 'MCQ',
        options:
          type !== 'ESSAY'
            ? ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']
            : undefined,
        correctAnswer: type !== 'ESSAY' ? 'A' : undefined,
      });
    }
    return questions;
  }

  async generateQuiz(
    content: string,
    numQuestions: number,
    difficulty: string,
  ) {
    // TODO: Gọi AI service
    const questions = [];
    for (let i = 0; i < numQuestions; i++) {
      questions.push({
        question_text: `Câu hỏi về: ${content.substring(0, 50)}...`,
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correct_answer: 'Option 1',
        explanation: 'Giải thích mẫu',
      });
    }
    return questions;
  }
}
