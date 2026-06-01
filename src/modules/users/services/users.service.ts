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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // ✅ ĐÚNG CHỖ

    private readonly auditService: AuditService,
  ) {}
  /**
   * Finds and returns public profile information for a given user ID.
   * Excludes sensitive information like credentials.
   * @param userId - The ID of the user to find.
   * @returns The user's public profile data.
   * @throws NotFoundException if the user is not found.
   */
  async findProfileById(userId: string): Promise<Partial<User>> {
    this.logger.log(`Fetching profile for user ID: ${userId}`);
    const user = await this.entityManager.findOne(User, {
      where: { id: userId },
      // Select only the fields considered safe for profile display [cite: 3599-3601]
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
      ],
    });

    if (!user) {
      this.logger.warn(`Profile not found for user ID: ${userId}`);
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng.');
    }

    this.logger.log(`Profile found for user ID: ${userId}`);
    return user;
  }

  /**
   * Updates the profile information for a given user using Optimistic Locking.
   * @param userId - The ID of the user whose profile is to be updated.
   * @param dto - The validated data transfer object containing updates and the client's 'updatedAt' timestamp.
   * @returns The updated user profile data.
   * @throws NotFoundException if the user is not found.
   * @throws ConflictException if optimistic lock fails (data was modified concurrently).
   * @throws InternalServerErrorException on unexpected database errors.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    this.logger.log(`Attempting to update profile for user ID: ${userId}`);

    // 1. Chuẩn bị dữ liệu cập nhật (chỉ lấy các trường được phép từ DTO)
    const dataToUpdate: Partial<User> = {};
    if (dto.fullName !== undefined) {
      // Chỉ cập nhật nếu trường được cung cấp
      dataToUpdate.fullName = dto.fullName;
    }
    if (dto.avatarUrl !== undefined) {
      // Cho phép set thành null
      dataToUpdate.avatarUrl = dto.avatarUrl;
    }
    // Không cho phép cập nhật email, role, status... qua endpoint này

    // Lấy timestamp từ client để kiểm tra Optimistic Lock
    const clientUpdatedAt = new Date(dto.updatedAt); // Chuyển đổi chuỗi ISO thành Date

    // Kiểm tra xem có dữ liệu cần cập nhật không (tránh query thừa)
    if (Object.keys(dataToUpdate).length === 0) {
      this.logger.log(
        `No fields to update for user ${userId}. Returning current profile.`,
      );
      // Trả về profile hiện tại nếu không có gì thay đổi
      return this.findProfileById(userId);
    }

    // 2. Thực hiện UPDATE với Optimistic Lock
    let affectedRows = 0;
    try {
      const updateResult = await this.entityManager.update(
        User,
        {
          id: userId,
          updatedAt: clientUpdatedAt, // Điều kiện Optimistic Lock: updatedAt phải khớp với client gửi lên
        },
        // Dữ liệu mới cần set (TypeORM tự động set updatedAt = now() khi update thành công)
        dataToUpdate,
      );

      affectedRows = updateResult.affected ?? 0;
    } catch (error) {
      // Xử lý các lỗi DB tiềm ẩn khác (vd: lỗi kết nối, ...)
      this.logger.error(
        `Error during profile update query for user ${userId}:`,
        error.stack,
      );
      throw new InternalServerErrorException('Lỗi cập nhật hồ sơ.');
    }

    // 3. Xử lý kết quả Optimistic Lock
    if (affectedRows === 0) {
      // Kiểm tra xem user có tồn tại nhưng updatedAt không khớp, hay user không tồn tại
      const userExists = await this.entityManager.findOne(User, {
        where: { id: userId },
        select: ['id', 'updatedAt'],
      });
      if (!userExists) {
        this.logger.warn(
          `Optimistic lock failed for user ${userId}: User not found.`,
        );
        throw new NotFoundException('Không tìm thấy người dùng để cập nhật.');
      } else {
        // User tồn tại -> Lỗi là do updatedAt không khớp
        this.logger.warn(
          `Optimistic lock failed for user ${userId}: Concurrent update detected. Client timestamp: ${clientUpdatedAt.toISOString()}, DB timestamp: ${userExists.updatedAt.toISOString()}`,
        );
        throw new ConflictException(
          'Dữ liệu đã được cập nhật bởi một phiên khác. Vui lòng tải lại trang và thử lại.',
        );
      }
    }

    // --- Cập nhật thành công ---
    this.logger.log(
      `Profile successfully updated for user ID: ${userId}. Fetching updated data...`,
    );

    // 4. Lấy lại thông tin user mới nhất để trả về
    // Dùng findProfileById để đảm bảo chỉ trả về các trường public
    const updatedUser = await this.findProfileById(userId);

    // 5. Ghi log audit
    const auditPayload: AuditLogPayload = {
      action: 'user.profile.updated',
      actorId: userId, // User tự cập nhật hồ sơ của mình
      meta: {
        userId: userId,
        // Ghi lại những trường đã thay đổi (nếu cần chi tiết)
        // diff: dataToUpdate // Hoặc tính diff chi tiết hơn
        updatedFields: Object.keys(dataToUpdate),
      },
    };
    this.auditService.log(auditPayload);
    this.logger.log(`Audit log recorded for profile update: ${userId}`);

    // 6. Trả về dữ liệu đã cập nhật
    return updatedUser;
  }

  async findOneByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  // --- Thêm phương thức vào class UsersService ---
  async findAll(query: UserQueryDto) {
    const { page, limit, role, status, q } = query;
    const skip = (page - 1) * limit;

    // 1. Khởi tạo QueryBuilder với alias 'user'
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 2. [TỐI ƯU DỮ LIỆU] Chỉ SELECT các trường cần thiết, loại bỏ password_hash
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.fullName',
      'user.role',
      'user.status',
      'user.createdAt',
    ]);

    // 3. [LỌC DỮ LIỆU] Thêm điều kiện WHERE động
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 4. [TÌM KIẾM MỜ] Sử dụng ILIKE cho email hoặc tên (PostgreSQL)
    if (q) {
      queryBuilder.andWhere('(user.email ILIKE :q OR user.fullName ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    // 5. [PHÂN TRANG & SẮP XẾP]
    queryBuilder
      .orderBy('user.createdAt', 'DESC') // Người mới nhất lên đầu
      .skip(skip)
      .take(limit);

    // 6. Thực thi truy vấn lấy dữ liệu và tổng số bản ghi (phục vụ FE làm Pagination)
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- [Task: S2-BE-05] PHẦN CODE THÊM MỚI ---
  /**
   * Cập nhật vai trò của người dùng với logic bảo vệ Admin cuối cùng
   * @param targetUserId ID của người dùng bị đổi quyền
   * @param newRole Vai trò mới
   * @param actionById ID của Admin đang thực hiện thao tác (để ghi log)
   * @param ip IP của Admin thực hiện (để ghi log)
   */
  async updateRole(
    targetUserId: string,
    newRole: UserRole,
    actionById: string,
    ip: string,
  ): Promise<void> {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException(
        'Không tìm thấy người dùng này trong hệ thống.',
      );
    }

    // Nếu role không thay đổi thì bỏ qua để tối ưu hiệu năng
    if (targetUser.role === newRole) {
      return;
    }

    // 2. [LOGIC BẢO MẬT CORE] Kiểm tra "Admin cuối cùng"
    // Nếu user hiện tại đang là ADMIN và bị hạ quyền xuống vai trò khác
    if (targetUser.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      // Đếm tổng số Admin đang Active trong toàn hệ thống
      const activeAdminsCount = await this.userRepository.count({
        where: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      // Nếu chỉ còn <= 1 Admin, ném lỗi từ chối thao tác
      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'Không thể hạ quyền Admin này vì đây là Quản trị viên đang hoạt động duy nhất còn lại của hệ thống.',
        );
      }
    }

    // 3. Thực hiện cập nhật quyền
    const oldRole = targetUser.role;
    targetUser.role = newRole;
    await this.userRepository.save(targetUser);

    // 4. [GHI LOG AUDIT] Lưu vết hành động nhạy cảm này
    // Cực kỳ quan trọng để quy trách nhiệm (Accountability) cho Admin
    await this.auditService.log({
      action: 'ADMIN_UPDATED_USER_ROLE',
      actorId: actionById, // [QUAN TRỌNG] ID của Admin thực hiện thao tác (Không phải ID người bị đổi)
      ip: ip,
      details: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        oldRole: oldRole,
        newRole: newRole,
        message: `Admin đã thay đổi quyền từ ${oldRole} sang ${newRole}`,
      },
    });
  }
}
