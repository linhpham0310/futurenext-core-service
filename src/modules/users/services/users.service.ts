/**
 * @file Service responsible for user-related business logic (profile, admin actions, etc.).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../entities/user.entity'; // Import User entity
import { UpdateProfileDto } from '../dto/update-profile.dto'; // Import DTO
import {
  AuditService,
  AuditLogPayload,
} from '@/shared/providers/audit/audit.service'; // Import AuditService
import { UserRole, UserStatus } from '@/modules/users/entities/user.entity';
import { UserQueryDto } from '../dto/user-query.dto';
import { PrismaService } from 'prisma/prisma.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserFullDto } from '../dto/update-user-full.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // ✅ ĐÚNG CHỖ

    private readonly auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  // Thêm vào users.service.ts

  async findProfileById(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'fullName',
        'email',
        'avatarUrl',
        'role',
        'createdAt',
        'updatedAt',
        'locale',
        'timezone',
        'phone',
      ],
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.phone !== undefined) user.phone = dto.phone;
    await this.userRepository.save(user);
    this.auditService.log({ action: 'user.profile.updated', actorId: userId });
    return this.findProfileById(userId);
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, role, status, q } = query;
    const skip = (page - 1) * limit;
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.fullName',
      'user.role',
      'user.status',
      'user.createdAt',
    ]);
    if (role) queryBuilder.andWhere('user.role = :role', { role });
    if (status) queryBuilder.andWhere('user.status = :status', { status });
    if (q) {
      queryBuilder.andWhere('(user.email ILIKE :q OR user.fullName ILIKE :q)', {
        q: `%${q}%`,
      });
    }
    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);
    const [items, total] = await queryBuilder.getManyAndCount();
    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateRole(
    targetUserId: string,
    newRole: UserRole,
    actionById: string,
    ip: string,
  ) {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new NotFoundException();
    if (targetUser.role === newRole) return;
    if (targetUser.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      const activeAdminsCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'Không thể hạ quyền admin duy nhất còn lại.',
        );
      }
    }
    const oldRole = targetUser.role;
    targetUser.role = newRole;
    await this.userRepository.save(targetUser);
    await this.auditService.log({
      action: 'ADMIN_UPDATED_USER_ROLE',
      actorId: actionById,
      ip,
      details: { targetUserId, oldRole, newRole },
    });
  }

  async findStudents(query: UserQueryDto) {
    return this.findAll({ ...query, role: UserRole.STUDENT });
  }

  async findStudentDetail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, role: UserRole.STUDENT },
      select: ['id', 'fullName', 'email', 'phone', 'status', 'createdAt'],
    });
    if (!user) throw new NotFoundException('Học viên không tồn tại');
    const coursesEnrolled = await this.prisma.purchase.count({
      where: { userId: id, status: 'COMPLETED' },
    });
    return { ...user, coursesEnrolled };
  }

  async updateStudentStatus(
    id: string,
    status: UserStatus.ACTIVE | UserStatus.LOCKED,
    actionById: string,
    ip: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id, role: UserRole.STUDENT },
    });
    if (!user) throw new NotFoundException();
    user.status = status;
    await this.userRepository.save(user);
    await this.auditService.log({
      action: 'ADMIN_UPDATED_STUDENT_STATUS',
      actorId: actionById,
      ip,
      details: { targetUserId: id, status },
    });
    return user;
  }

  async updateUserPartial(
    targetUserId: string,
    dto: UpdateUserDto,
    actionById: string,
    ip: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException();
    if (dto.role !== undefined)
      await this.updateRole(targetUserId, dto.role, actionById, ip);
    if (dto.status !== undefined) {
      user.status = dto.status;
      await this.userRepository.save(user);
      await this.auditService.log({
        action: 'ADMIN_UPDATED_USER_STATUS',
        actorId: actionById,
        ip,
        details: { targetUserId, status: dto.status },
      });
    }
    return user;
  }

  async updateUserFull(
    targetUserId: string,
    dto: UpdateUserFullDto,
    actionById: string,
    ip: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException();
    const oldRole = user.role;
    const oldStatus = user.status;
    Object.assign(user, dto);
    await this.userRepository.save(user);
    await this.auditService.log({
      action: 'ADMIN_UPDATED_USER_FULL',
      actorId: actionById,
      ip,
      details: {
        targetUserId,
        oldRole,
        newRole: dto.role,
        oldStatus,
        newStatus: dto.status,
      },
    });
    return user;
  }

  async deleteUser(targetUserId: string, actionById: string, ip: string) {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException();
    if (user.role === UserRole.ADMIN) {
      const activeAdminsCount = await this.userRepository.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (activeAdminsCount <= 1)
        throw new BadRequestException('Không thể xóa admin duy nhất');
    }
    await this.userRepository.softDelete(targetUserId);
    await this.auditService.log({
      action: 'ADMIN_DELETED_USER',
      actorId: actionById,
      ip,
      details: { targetUserId, email: user.email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
