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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findProfileById()', () => {
    const userId = 'user-1';

    it('should return user profile with teacherProfile relation', async () => {
      const user = {
        id: userId,
        fullName: 'Test User',
        email: 'test@example.com',
        role: UserRole.TEACHER,
        teacherProfile: { id: 'profile-1', status: 'APPROVED' },
      };
      mockEntityManager.findOne.mockResolvedValue(user);

      const result = await service.findProfileById(userId);

      expect(result).toEqual(user);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          where: { id: userId },
          select: expect.any(Array),
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.findProfileById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile()', () => {
    const userId = 'user-1';
    const currentTimestamp = new Date('2024-01-01T00:00:00.000Z');
    const updateDto = {
      fullName: 'Updated Name',
      avatarUrl: 'https://example.com/avatar.jpg',
      updatedAt: currentTimestamp.toISOString(),
    };

    it('should successfully update profile with optimistic lock', async () => {
      mockEntityManager.update.mockResolvedValue({ affected: 1 });
      mockEntityManager.findOne.mockResolvedValue({
        id: userId,
        fullName: 'Updated Name',
        updatedAt: new Date(),
      });

      const result = await service.updateProfile(userId, updateDto);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        User,
        { id: userId, updatedAt: currentTimestamp },
        { fullName: updateDto.fullName, avatarUrl: updateDto.avatarUrl },
      );
      expect(result).toHaveProperty('fullName', 'Updated Name');
    });

    it('should throw ConflictException if optimistic lock fails', async () => {
      mockEntityManager.update.mockResolvedValue({ affected: 0 });
      mockEntityManager.findOne.mockResolvedValue({
        id: userId,
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      });

      await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockEntityManager.update.mockResolvedValue({ affected: 0 });
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return current profile if no fields to update', async () => {
      const currentUser = {
        id: userId,
        fullName: 'Old Name',
        updatedAt: currentTimestamp,
      };
      mockEntityManager.findOne.mockResolvedValue(currentUser);

      const result = await service.updateProfile(userId, {
        updatedAt: currentTimestamp.toISOString(),
      });

      expect(result).toEqual(currentUser);
      expect(mockEntityManager.update).not.toHaveBeenCalled();
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
