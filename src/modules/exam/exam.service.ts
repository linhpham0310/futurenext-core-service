import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateExamDto,
  PublishExamDto,
  UpdateExamDto,
} from './dto/create-exam.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  // Teacher: create
  async create(teacherId: string, dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        topic: dto.topic,
        type: dto.type,
        duration: dto.duration,
        teacherId,
        questions: dto.questions,
        status: 'DRAFT',
      },
    });
  }

  // Teacher: list
  async findAllByTeacher(teacherId: string, query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const where: any = { teacherId };
    if (status) where.status = status;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Teacher: get one
  async findOne(id: string, teacherId?: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    if (teacherId && exam.teacherId !== teacherId)
      throw new ForbiddenException('Not your exam');
    return exam;
  }

  // Teacher: update
  async update(id: string, teacherId: string, dto: UpdateExamDto) {
    await this.findOne(id, teacherId);
    return this.prisma.exam.update({ where: { id }, data: dto });
  }

  // Teacher: delete
  async delete(id: string, teacherId: string) {
    await this.findOne(id, teacherId);
    return this.prisma.exam.delete({ where: { id } });
  }

  // Teacher: generate quiz (AI mock)
  async generateQuiz(dto: GenerateQuizDto) {
    // TODO: Gọi AI service (OpenAI/Gemini) thực tế
    const mockQuestions = Array.from({ length: dto.numQuestions }).map(
      (_, i) => ({
        text: `Câu hỏi ${i + 1} về ${dto.topic}?`,
        type: dto.type === 'ESSAY' ? 'ESSAY' : 'MCQ',
        options: dto.type !== 'ESSAY' ? ['A', 'B', 'C', 'D'] : undefined,
        correctAnswer: dto.type !== 'ESSAY' ? 'A' : undefined,
      }),
    );
    return { questions: mockQuestions };
  }

  // Teacher: publish to course
  async publish(id: string, teacherId: string, dto: PublishExamDto) {
    const exam = await this.findOne(id, teacherId);
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instructorId: teacherId },
    });
    if (!course) throw new ForbiddenException('Course not found or not yours');
    await this.prisma.courseExam.create({
      data: { courseId: dto.courseId, examId: id, assignedAt: new Date() },
    });
    await this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
    return { message: 'Exam published to course' };
  }

  // Teacher: get results for an exam
  async getExamResults(teacherId: string, examId: string) {
    const exam = await this.findOne(examId, teacherId);
    const results = await this.prisma.examResult.findMany({
      where: { examId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    return {
      examTitle: exam.title,
      results: results.map((r) => ({
        studentId: r.user.id,
        studentName: r.user.fullName,
        email: r.user.email,
        score: r.score,
        submittedAt: r.submittedAt,
        status: r.status,
      })),
    };
  }

  // Student: get assigned exams
  async getAssignedExams(studentId: string) {
    const enrollments = await this.prisma.purchase.findMany({
      where: { userId: studentId, status: 'COMPLETED' },
      include: { course: { include: { exams: { include: { exam: true } } } } },
    });
    const exams = enrollments.flatMap((e) =>
      e.course.exams.map((ce) => ce.exam),
    );
    const results = await this.prisma.examResult.findMany({
      where: { userId: studentId, examId: { in: exams.map((e) => e.id) } },
    });
    return exams.map((exam) => ({
      ...exam,
      status:
        results.find((r) => r.examId === exam.id)?.status || 'NOT_STARTED',
      score: results.find((r) => r.examId === exam.id)?.score,
    }));
  }

  // Student: take exam (get questions + start time)
  async getExamForTaking(studentId: string, examId: string) {
    const examAssigned = await this.prisma.courseExam.findFirst({
      where: {
        examId,
        course: {
          purchases: { some: { userId: studentId, status: 'COMPLETED' } },
        },
      },
    });
    if (!examAssigned)
      throw new ForbiddenException('You are not assigned this exam');
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException();
    const existing = await this.prisma.examResult.findUnique({
      where: { userId_examId: { userId: studentId, examId } },
    });
    if (existing && existing.status === 'COMPLETED') {
      throw new BadRequestException('You already submitted this exam');
    }
    let result = existing;
    if (!result) {
      result = await this.prisma.examResult.create({
        data: {
          userId: studentId,
          examId,
          status: 'IN_PROGRESS',
          startTime: new Date(),
        },
      });
    }
    return {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      questions: exam.questions,
      startTime: result.startTime,
      status: result.status,
    };
  }

  // Student: submit exam
  async submitExam(
    studentId: string,
    examId: string,
    answers: Record<string, string>,
  ) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException();
    let score = 0;
    const details = [];
    for (const q of exam.questions as any[]) {
      const userAnswer = answers[q.id];
      let isCorrect = false;
      if (q.type === 'MCQ' && userAnswer === q.correctAnswer) {
        isCorrect = true;
        score += 1;
      }
      details.push({ questionId: q.id, userAnswer, isCorrect });
    }
    const total = exam.questions.length;
    const finalScore = exam.type === 'ESSAY' ? null : (score / total) * 100;
    const result = await this.prisma.examResult.update({
      where: { userId_examId: { userId: studentId, examId } },
      data: {
        score: finalScore,
        answers,
        status: 'COMPLETED',
        submittedAt: new Date(),
      },
    });
    return { result, details };
  }

  // Student: get result
  async getExamResult(studentId: string, examId: string) {
    const result = await this.prisma.examResult.findUnique({
      where: { userId_examId: { userId: studentId, examId } },
    });
    if (!result || result.status !== 'COMPLETED')
      throw new BadRequestException('Not completed');
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    const details = exam.questions.map((q: any) => {
      const userAnswer = result.answers?.[q.id];
      return {
        questionText: q.text,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect:
          q.type === 'MCQ' ? userAnswer === q.correctAnswer : undefined,
        explanation: q.explanation,
      };
    });
    return {
      score: result.score,
      totalQuestions: exam.questions.length,
      details,
    };
  }
}
