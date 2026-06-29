import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ExamType } from '@prisma/client';

describe('ExamService', () => {
  let service: ExamService;
  let prisma: PrismaService;
  let aiService: AiService;

  const mockExam = {
    id: 'exam-id',
    teacherId: 'teacher-id',
    courseId: 'course-id',
    title: 'Test Exam',
    topic: 'Test Topic',
    type: ExamType.MCQ,
    duration: 60,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExamQuestions = [
    {
      id: 'q1',
      examId: 'exam-id',
      text: 'What is React?',
      type: 'MCQ',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      explanation: 'React is a library',
      orderIndex: 1,
    },
    {
      id: 'q2',
      examId: 'exam-id',
      text: 'Explain useState',
      type: 'ESSAY',
      options: null,
      correctAnswer: null,
      explanation: 'useState is a Hook',
      orderIndex: 2,
    },
  ];

  const mockResult = {
    id: 'result-id',
    examId: 'exam-id',
    userId: 'student-id',
    score: 8,
    totalQuestions: 10,
    answers: { q1: 'A', q2: 'useState is...' },
    submittedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        {
          provide: PrismaService,
          useValue: {
            exam: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            examQuestion: {
              createMany: jest.fn(),
              findMany: jest.fn(),
            },
            examResult: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            purchase: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            course: {
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback()),
          },
        },
        {
          provide: AiService,
          useValue: {
            generateQuizQuestions: jest.fn().mockResolvedValue([
              {
                text: 'AI Generated Question',
                type: 'MCQ',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 'A',
                explanation: 'AI explanation',
              },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
  });

  describe('generateQuestionsByAI', () => {
    it('should generate questions using AI', async () => {
      const result = await service.generateQuestionsByAI('React', 'MCQ', 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('type');
      expect(aiService.generateQuizQuestions).toHaveBeenCalled();
    });
  });

  describe('createExam', () => {
    it('should create an exam successfully', async () => {
      const dto = {
        title: 'New Exam',
        topic: 'React',
        type: ExamType.MCQ,
        duration: 60,
        questions: mockExamQuestions,
      };

      jest.spyOn(prisma.exam, 'create').mockResolvedValue(mockExam as any);

      const result = await service.createExam('teacher-id', dto);

      expect(result).toHaveProperty('id');
      expect(prisma.exam.create).toHaveBeenCalled();
    });
  });

  describe('getExamById', () => {
    it('should return exam if found and owned by teacher', async () => {
      jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue({
        ...mockExam,
        questions: mockExamQuestions,
      } as any);

      const result = await service.getExamById('exam-id', 'teacher-id');

      expect(result).toHaveProperty('id');
      expect(result.questions).toHaveLength(2);
    });

    it('should throw error if exam not found', async () => {
      jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getExamById('exam-id', 'teacher-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if teacher does not own exam', async () => {
      jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue({
        ...mockExam,
        teacherId: 'different-teacher',
      } as any);

      await expect(
        service.getExamById('exam-id', 'teacher-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitExam', () => {
    it('should submit exam and calculate score for MCQ', async () => {
      const answers = { q1: 'A', q2: 'useState is a Hook' };

      jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue({
        ...mockExam,
        type: ExamType.MCQ,
        questions: mockExamQuestions,
      } as any);

      jest.spyOn(prisma.examResult, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prisma.examResult, 'create')
        .mockResolvedValue(mockResult as any);

      const result = await service.submitExam('exam-id', 'student-id', answers);

      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('details');
      expect(prisma.examResult.create).toHaveBeenCalled();
    });
  });
});
