import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuditService } from '@/shared/providers/audit/audit.service';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthService } from '../../auth/services/auth.service';
import { SecurityAuditLog } from '@/shared/providers/audit/audit.entity';

describe('UsersService', () => {
  let service: UsersService;

  // Mock EntityManager (có thêm find)
  const mockEntityManager = {
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(), // <-- thêm find
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
    softDelete: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockPrismaService = {
    purchase: { count: jest.fn() },
  };

  // Mock AuthService
  const mockAuthService = {
    handleForgotPassword: jest.fn().mockResolvedValue(undefined),
  };

  // Mock SecurityAuditLog repository
  const mockAuditLogRepository = {
    find: jest.fn().mockResolvedValue([]),
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
        { provide: AuthService, useValue: mockAuthService }, // <-- thêm
        {
          provide: getRepositoryToken(SecurityAuditLog),
          useValue: mockAuditLogRepository,
        }, // <-- thêm
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
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.findProfileById(userId);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

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
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(updatedUser);

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

  describe('updateRole', () => {
    it('should throw NotFoundException if user does not exist', async () => {
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

    it('should early return if role is same', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        role: UserRole.TEACHER,
      });

      await service.updateRole('u1', UserRole.TEACHER, 'admin_id', '127.0.0.1');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to demote last admin', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'admin1',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      });
      mockUserRepository.count.mockResolvedValue(1);

      await expect(
        service.updateRole('admin1', UserRole.STUDENT, 'admin_id', '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserRepository.count).toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should update role successfully and log audit', async () => {
      const targetUser = {
        id: 'u1',
        role: UserRole.TEACHER,
        email: 'test@email.com',
      };
      mockUserRepository.findOne.mockResolvedValue(targetUser);

      await service.updateRole('u1', UserRole.ADMIN, 'admin_id', '127.0.0.1');

      expect(targetUser.role).toBe(UserRole.ADMIN);
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
