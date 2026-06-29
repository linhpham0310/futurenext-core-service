import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseService } from './course.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '../ai/ai.service';
import { User } from '../users/entities/user.entity';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CourseStatus } from '@prisma/client';

describe('CourseService', () => {
  let service: CourseService;
  let prisma: PrismaService;
  let storageService: SupabaseStorageService;
  let eventEmitter: EventEmitter2;

  const mockCourse = {
    id: 'course-id',
    instructorId: 'teacher-id',
    title: 'Test Course',
    slug: 'test-course',
    description: 'Test description',
    price: 0,
    status: CourseStatus.DRAFT,
    thumbnailUrl: null,
    outcomes: [],
    aiMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSection = {
    id: 'section-id',
    courseId: 'course-id',
    title: 'Test Section',
    orderIndex: 1,
    metadata: {},
  };

  const mockLesson = {
    id: 'lesson-id',
    sectionId: 'section-id',
    courseId: 'course-id',
    title: 'Test Lesson',
    slug: 'test-lesson',
    type: 'ARTICLE',
    content: 'Test content',
    duration: 10,
    orderIndex: 1,
    isFreePreview: false,
    aiMetadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: PrismaService,
          useValue: {
            course: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            section: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            lesson: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            purchase: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            learningProgress: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
            },
            courseReviewLog: {
              create: jest.fn(),
            },
            review: {
              findMany: jest.fn(),
            },
            question: {
              findMany: jest.fn(),
            },
            certificate: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
            },
            revenueTransaction: {
              create: jest.fn(),
              aggregate: jest.fn(),
            },
            notification: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback()),
          },
        },
        {
          provide: SupabaseStorageService,
          useValue: {
            createSignedUploadUrl: jest.fn().mockResolvedValue({
              signedUrl: 'https://mock-signed-url.com',
              fileKey: 'mock-file-key',
            }),
            deleteFile: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: AiService,
          useValue: {
            generateOutline: jest
              .fn()
              .mockResolvedValue([
                { title: 'Chapter 1', lessons: ['Lesson 1', 'Lesson 2'] },
              ]),
          },
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
    prisma = module.get<PrismaService>(PrismaService);
    storageService = module.get<SupabaseStorageService>(SupabaseStorageService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('createDraft', () => {
    it('should create a draft course successfully', async () => {
      const dto = {
        title: 'New Course',
        description: 'New description',
        price: 0,
        thumbnailUrl: null,
      };

      jest.spyOn(prisma.course, 'create').mockResolvedValue({
        ...mockCourse,
        title: dto.title,
        description: dto.description,
      } as any);

      const result = await service.createDraft('teacher-id', dto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(dto.title);
      expect(prisma.course.create).toHaveBeenCalled();
    });
  });

  describe('submitCourse', () => {
    it('should submit a course successfully', async () => {
      jest.spyOn(prisma.course, 'findUnique').mockResolvedValue({
        ...mockCourse,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        _count: { sections: 1 },
        sections: [{ _count: { lessons: 5 } }],
      } as any);

      jest.spyOn(prisma.course, 'update').mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.SUBMITTED,
      } as any);

      const result = await service.submitCourse('course-id');

      expect(result.status).toBe(CourseStatus.SUBMITTED);
    });

    it('should throw error if course has no thumbnail', async () => {
      jest.spyOn(prisma.course, 'findUnique').mockResolvedValue({
        ...mockCourse,
        thumbnailUrl: null,
        _count: { sections: 1 },
      } as any);

      await expect(service.submitCourse('course-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if course has no sections', async () => {
      jest.spyOn(prisma.course, 'findUnique').mockResolvedValue({
        ...mockCourse,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        _count: { sections: 0 },
      } as any);

      await expect(service.submitCourse('course-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processReview', () => {
    it('should approve a course successfully', async () => {
      jest.spyOn(prisma.course, 'findUnique').mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.SUBMITTED,
      } as any);

      jest.spyOn(prisma.course, 'update').mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.PUBLISHED,
      } as any);

      const result = await service.processReview('course-id', 'admin-id', {
        action: CourseStatus.PUBLISHED,
      });

      expect(result.status).toBe(CourseStatus.PUBLISHED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'course.published',
        expect.objectContaining({ courseId: 'course-id' }),
      );
    });

    it('should reject a course successfully', async () => {
      jest.spyOn(prisma.course, 'findUnique').mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.SUBMITTED,
      } as any);

      jest.spyOn(prisma.course, 'update').mockResolvedValue({
        ...mockCourse,
        status: CourseStatus.REJECTED,
      } as any);

      const result = await service.processReview('course-id', 'admin-id', {
        action: CourseStatus.REJECTED,
        reason: 'Content quality is poor',
      });

      expect(result.status).toBe(CourseStatus.REJECTED);
      expect(prisma.courseReviewLog.create).toHaveBeenCalled();
    });
  });
});
