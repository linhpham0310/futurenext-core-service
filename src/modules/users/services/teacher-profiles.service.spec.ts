// [Task: S3-BE-04] Khởi tạo Unit Test cho TeacherProfilesService
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { TeacherProfilesService } from './teacher-profiles.service';
import { TeacherProfile } from '../entities/teacher-profile.entity';
import { User } from '../entities/user.entity';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';
import { PrismaService } from '../../../../prisma/prisma.service';

// Import AuditService từ đường dẫn tương ứng của dự án bạn
import { AuditService } from '../../../shared/providers/audit/audit.service';

describe('TeacherProfilesService', () => {
  let service: TeacherProfilesService;

  // [Task: S3-BE-04] 1. Khai báo các Mock Objects
  const mockTeacherProfileRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  // Giả lập hệ thống Transaction của TypeORM
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn().mockResolvedValue({}),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  // [Task: S3-BE-04] 2. Thiết lập Testing Module trước mỗi Test Case
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherProfilesService,
        {
          provide: getRepositoryToken(TeacherProfile),
          useValue: mockTeacherProfileRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeacherProfilesService>(TeacherProfilesService);
  });

  // Xóa lịch sử gọi hàm của các mock sau mỗi TC để tránh rác dữ liệu
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // [Task: S3-BE-04] TEST SUITE: submitProfile
  // =========================================================================
  describe('submitProfile', () => {
    const userId = 'user-123';
    const dto = { bio: 'Test Bio', expertise: ['NodeJS'] };

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null); // Giả lập không tìm thấy User

      await expect(service.submitProfile(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw ConflictException if profile already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: userId }); // User hợp lệ
      mockTeacherProfileRepo.findOne.mockResolvedValue({ id: 'profile-123' }); // Nhưng Profile đã tồn tại

      await expect(service.submitProfile(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and save a new profile successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: userId });
      mockTeacherProfileRepo.findOne.mockResolvedValue(null); // Chưa có profile

      const newProfile = { user_id: userId, ...dto, status: 'PENDING' };
      mockTeacherProfileRepo.create.mockReturnValue(newProfile);
      mockTeacherProfileRepo.save.mockResolvedValue({
        id: 'new-profile-id',
        ...newProfile,
      });

      const result = await service.submitProfile(userId, dto);

      expect(result).toHaveProperty('id', 'new-profile-id');
      expect(result.status).toBe('PENDING');
      expect(mockTeacherProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining(dto),
      );
      expect(mockTeacherProfileRepo.save).toHaveBeenCalled();
    });
  });
  // =========================================================================
  // [Task: S3-BE-04] TEST SUITE: updateProfile
  // =========================================================================
  describe('updateProfile', () => {
    const userId = 'user-123';
    const dto = { bio: 'Updated Bio', expertise: ['NodeJS'] };
    it('should create new profile if not exists', async () => {
      mockTeacherProfileRepo.findOne.mockResolvedValue(null);

      const newProfile = {
        id: 'new-profile-id',
        userId,
        bio: dto.bio,
        expertise: dto.expertise || [],
        status: TeacherProfileStatus.PENDING_REVIEW,
      };
      mockTeacherProfileRepo.create.mockReturnValue(newProfile);
      mockTeacherProfileRepo.save.mockResolvedValue(newProfile);

      const result = await service.updateProfile(userId, dto);

      expect(mockTeacherProfileRepo.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockTeacherProfileRepo.create).toHaveBeenCalledWith({
        userId,
        bio: dto.bio,
        expertise: dto.expertise || [],
        status: TeacherProfileStatus.PENDING_REVIEW,
      });
      expect(mockTeacherProfileRepo.save).toHaveBeenCalledWith(newProfile);
      expect(result).toEqual(newProfile);
    });

    it('should throw BadRequestException if status is not PENDING', async () => {
      // Giả lập hồ sơ đã được duyệt (APPROVED)
      mockTeacherProfileRepo.findOne.mockResolvedValue({
        user_id: userId,
        status: TeacherProfileStatus.APPROVED,
      });

      await expect(service.updateProfile(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update profile successfully when status is PENDING', async () => {
      const existingProfile = {
        userId,
        status: TeacherProfileStatus.PENDING_REVIEW,
        bio: 'Old Bio',
        expertise: [],
      };

      mockTeacherProfileRepo.findOne.mockResolvedValue(existingProfile);
      mockTeacherProfileRepo.save.mockResolvedValue({
        ...existingProfile,
        bio: 'Updated Bio',
      });

      const result = await service.updateProfile(userId, dto);

      expect(result.bio).toBe('Updated Bio');
      expect(mockTeacherProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bio: 'Updated Bio' }),
      );
    });
  });
  // =========================================================================
  // [Task: S3-BE-04] TEST SUITE: reviewProfile (Admin Action)
  // =========================================================================
  describe('reviewProfile', () => {
    const adminId = 'admin-999';
    const profileId = 'profile-123';
    const reviewDto = { status: TeacherProfileStatus.APPROVED };

    it('should throw BadRequestException if profile is already processed', async () => {
      mockTeacherProfileRepo.findOne.mockResolvedValue({
        id: profileId,
        status: TeacherProfileStatus.REJECTED, // Đã xử lý
      });

      await expect(
        service.reviewProfile(adminId, profileId, reviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve profile, update user role, and log audit successfully using Transaction', async () => {
      const mockUser = { id: 'user-123', role: 'USER' };
      const mockProfile = {
        id: profileId,
        status: TeacherProfileStatus.PENDING_REVIEW,
        user: mockUser,
      };

      mockTeacherProfileRepo.findOne.mockResolvedValue(mockProfile);

      const result = await service.reviewProfile(adminId, profileId, reviewDto);

      // Kiểm tra luồng Transaction
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // Kiểm tra manager.save được gọi 2 lần (1 cho Profile, 1 cho User)
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);

      // Kiểm tra trạng thái đã được đổi
      expect(result.status).toBe(TeacherProfileStatus.APPROVED);
      expect(mockUser.role).toBe('teacher'); // Xác nhận role user đã đổi

      // Kiểm tra Transaction commit và release
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Kiểm tra AuditLog được gọi với đúng Payload
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REVIEW_TEACHER_PROFILE',
          actorId: adminId,
          targetId: 'user-123',
          details: expect.objectContaining({
            new_status: TeacherProfileStatus.APPROVED,
            assigned_role: 'TEACHER',
            old_status: TeacherProfileStatus.PENDING_REVIEW,
            profile_id: profileId,
          }),
        }),
      );
    });

    it('should rollback transaction if an error occurs during save', async () => {
      const mockProfile = {
        id: profileId,
        status: TeacherProfileStatus.PENDING_REVIEW,
        user: {},
      };
      mockTeacherProfileRepo.findOne.mockResolvedValue(mockProfile);

      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.reviewProfile(adminId, profileId, reviewDto),
      ).rejects.toThrow('DB Error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
