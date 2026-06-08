import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { course: true },
    });
    return favorites.map((f) => f.course);
  }

  async addFavorite(userId: string, courseId: string) {
    return this.prisma.favorite.create({
      data: { userId, courseId },
    });
  }

  async removeFavorite(userId: string, courseId: string) {
    return this.prisma.favorite.delete({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { course: { select: { title: true, id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.delete({ where: { id: reviewId } });
  }

  async getAssignedExams(userId: string) {
    // Lấy các bài thi được gán qua khóa học mà học viên đã mua
    const purchases = await this.prisma.purchase.findMany({
      where: { userId, status: 'SUCCESS' },
      include: {
        course: { include: { examAssignments: { include: { exam: true } } } },
      },
    });
    const exams = [];
    for (const purchase of purchases) {
      for (const assign of purchase.course.examAssignments) {
        const submission = await this.prisma.examSubmission.findFirst({
          where: { examId: assign.examId, userId },
        });
        exams.push({
          id: assign.exam.id,
          title: assign.exam.title,
          duration: assign.exam.duration,
          deadline: assign.deadline,
          status: submission
            ? submission.submittedAt
              ? 'COMPLETED'
              : 'IN_PROGRESS'
            : 'NOT_STARTED',
          score: submission?.score,
        });
      }
    }
    return exams;
  }

  async getExamDetail(examId: string, userId: string) {
    // Kiểm tra học viên có được phép thi không
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId },
      include: {
        courseAssignments: {
          include: { course: { include: { purchases: true } } },
        },
      },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    const hasAccess = exam.courseAssignments.some((assign) =>
      assign.course.purchases.some(
        (p) => p.userId === userId && p.status === 'SUCCESS',
      ),
    );
    if (!hasAccess)
      throw new ForbiddenException('Bạn không có quyền làm bài thi này');
    const submission = await this.prisma.examSubmission.findFirst({
      where: { examId, userId },
    });
    const status = submission
      ? submission.submittedAt
        ? 'COMPLETED'
        : 'IN_PROGRESS'
      : 'NOT_STARTED';
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalQuestions: exam.questions?.length || 0,
      status,
    };
  }

  async startExam(examId: string, userId: string) {
    let submission = await this.prisma.examSubmission.findFirst({
      where: { examId, userId },
    });
    if (!submission) {
      submission = await this.prisma.examSubmission.create({
        data: { examId, userId, answers: {}, startTime: new Date() },
      });
    }
    return { message: 'Bắt đầu làm bài', submissionId: submission.id };
  }

  async submitExam(examId: string, userId: string, answers: any) {
    const submission = await this.prisma.examSubmission.findFirst({
      where: { examId, userId, submittedAt: null },
    });
    if (!submission)
      throw new BadRequestException('Không tìm thấy bài làm hoặc đã nộp');
    // Tính điểm (giả sử có logic chấm điểm)
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    let score = 0;
    // Giả sử exam.questions là JSON lưu câu hỏi và đáp án đúng
    if (exam.questions) {
      const questions = exam.questions;
      let correct = 0;
      for (const q of questions) {
        if (answers[q.id] === q.correctAnswer) correct++;
      }
      score = (correct / questions.length) * 10;
    }
    const updated = await this.prisma.examSubmission.update({
      where: { id: submission.id },
      data: { answers, submittedAt: new Date(), score },
    });
    return { message: 'Nộp bài thành công', score };
  }

  async getExamResult(examId: string, userId: string) {
    const submission = await this.prisma.examSubmission.findFirst({
      where: { examId, userId, submittedAt: { not: null } },
    });
    if (!submission) throw new NotFoundException('Chưa có kết quả');
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    // Xây dựng chi tiết câu trả lời
    const details = [];
    if (exam.questions) {
      for (const q of exam.questions) {
        details.push({
          questionText: q.text,
          userAnswer: submission.answers[q.id] || '',
          correctAnswer: q.correctAnswer,
          isCorrect: submission.answers[q.id] === q.correctAnswer,
          explanation: q.explanation,
        });
      }
    }
    return {
      score: submission.score,
      totalQuestions: exam.questions?.length || 0,
      correctCount: details.filter((d) => d.isCorrect).length,
      wrongCount: details.filter((d) => !d.isCorrect).length,
      details,
    };
  }

  async askAi(userId: string, lessonId: string, question: string) {
    // Gọi AI service RAG
    // Tạm thời trả về mock
    return {
      answer: `Đây là câu trả lời AI cho câu hỏi: "${question}" dựa trên ngữ cảnh bài học.`,
    };
  }

  async changePassword(
    userId: string,
    body: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new ForbiddenException('Mật khẩu hiện tại không đúng');
    const newHash = await bcrypt.hash(body.newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}
