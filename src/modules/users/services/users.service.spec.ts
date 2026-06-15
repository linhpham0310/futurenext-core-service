// src/modules/users/services/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuditService } from '@/shared/providers/audit/audit.service';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { PrismaService } from '../../../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockEntityManager = {
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockPrismaService = {
    purchase: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findProfileById()', () => {
    const userId = 'user-1';

    it('should return user profile', async () => {
      const user = {
        id: userId,
        fullName: 'Test User',
        email: 'test@example.com',
      };
      mockUserRepository.findOne.mockResolvedValue(user); // ← dùng mockUserRepository

      const result = await service.findProfileById(userId);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // ← dùng mockUserRepository

      await expect(service.findProfileById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile()', () => {
    const userId = 'user-1';

    it('should successfully update profile', async () => {
      const existingUser = {
        id: userId,
        fullName: 'Old Name',
        avatarUrl: null,
        phone: null,
      };
      const updatedUser = { id: userId, fullName: 'Updated Name' };

      mockUserRepository.findOne
        .mockResolvedValueOnce(existingUser) // lần 1: tìm để update
        .mockResolvedValueOnce(updatedUser); // lần 2: findProfileById sau save

      const result = await service.updateProfile(userId, {
        fullName: 'Updated Name',
      });

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('fullName', 'Updated Name');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, { fullName: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
  // --- [Task: S2-BE-08] TEST CHO UPDATE ROLE & ADMIN CHECK ---
  describe('updateRole', () => {
    it('nên ném NotFoundException nếu user không tồn tại', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(
          'fake_id',
          UserRole.TEACHER,
          'admin_id',
          '127.0.0.1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('nên kết thúc sớm nếu role mới giống role cũ (Không gọi DB save)', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        role: UserRole.TEACHER,
      });

      await service.updateRole('u1', UserRole.TEACHER, 'admin_id', '127.0.0.1');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('nên ném BadRequestException nếu cố hạ quyền Admin cuối cùng', async () => {
      // Giả lập user mục tiêu đang là Admin
      mockUserRepository.findOne.mockResolvedValue({
        id: 'admin1',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      // Giả lập DB chỉ còn 1 Admin đang active
      mockUserRepository.count.mockResolvedValue(1);

      await expect(
        service.updateRole('admin1', UserRole.STUDENT, 'admin_id', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.count).toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('nên cập nhật role thành công và ghi log audit', async () => {
      // Giả lập user mục tiêu đang là Teacher
      const targetUser = {
        id: 'u1',
        role: UserRole.TEACHER,
        email: 'test@email.com',
      };
      mockUserRepository.findOne.mockResolvedValue(targetUser);

      await service.updateRole('u1', UserRole.ADMIN, 'admin_id', '127.0.0.1');

      expect(targetUser.role).toBe(UserRole.ADMIN); // Đảm bảo object đã được đổi state
      expect(mockUserRepository.save).toHaveBeenCalledWith(targetUser);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADMIN_UPDATED_USER_ROLE',
          actorId: 'admin_id',
        }),
      );
    });
  });
});
