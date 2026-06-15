// [Task: S3-BE-01] Service xử lý nghiệp vụ cho Teacher Profile
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TeacherProfile } from '../entities/teacher-profile.entity'; // Entity từ Task DB
import { User } from '../entities/user.entity'; // Entity cũ
import {
  SubmitTeacherProfileDto,
  UpdateTeacherProfileDto,
} from '../dto/teacher-profile.dto';
// [Task: S3-BE-02] Import DTO và Enum của Admin
import {
  GetTeacherProfilesFilterDto,
  ReviewTeacherProfileDto,
} from '../dto/admin-teacher-profile.dto';
import { UserRole } from '../entities/user.entity';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';

// [Task: S3-BE-03] Import AuditService từ module shared (Điều chỉnh đường dẫn theo cấu trúc thực tế nếu cần)
import { AuditService } from '../../../shared/providers/audit/audit.service';

@Injectable()
export class TeacherProfilesService {
  constructor(
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepo: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // [Task: S3-BE-02] Inject DataSource vào constructor
    private readonly dataSource: DataSource,
    // [Task: S3-BE-03] Inject AuditService vào constructor
    private readonly auditService: AuditService,
  ) {}

  // [Task: S3-BE-01] Logic nộp hồ sơ mới
  // src/modules/users/services/teacher-profiles.service.ts

  async submitProfile(
    userId: string,
    dto: SubmitTeacherProfileDto,
  ): Promise<TeacherProfile> {
    console.log('=== submitProfile called ===');
    console.log('userId:', userId);
    console.log('dto:', dto);

    // 1. Kiểm tra user tồn tại
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${userId}`,
      );
    }

    // 2. Kiểm tra profile đã tồn tại
    const existingProfile = await this.teacherProfileRepo.findOne({
      where: { userId: userId },
    });

    if (existingProfile) {
      throw new ConflictException('Hồ sơ giáo viên của bạn đã tồn tại.');
    }

    // 3. Xử lý expertise an toàn
    const safeExpertise =
      dto.expertise && Array.isArray(dto.expertise) ? dto.expertise : [];

    // 4. Tạo profile

    const newProfile = this.teacherProfileRepo.create({
      userId: userId,
      bio: dto.bio,
      expertise: safeExpertise,
      status: TeacherProfileStatus.PENDING_REVIEW,
    });

    console.log('profile to save:', newProfile);

    // 5. Lưu
    const saved = await this.teacherProfileRepo.save(newProfile);
    console.log('saved profile:', saved);

    return saved;
  }

  // =========================================================================
  // [Task: S3-BE-02] LOGIC DÀNH CHO ADMIN
  // =========================================================================

  // [Task: S3-BE-02] Hàm lấy danh sách hồ sơ (kèm thông tin user)
  async findAllForAdmin(filterDto: GetTeacherProfilesFilterDto) {
    const { status, page = 1, limit = 10 } = filterDto;

    // Sử dụng QueryBuilder để Join bảng users, lấy email hiển thị cho Admin
    const queryBuilder = this.teacherProfileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .select([
        'profile.id',
        'profile.bio',
        'profile.expertise',
        'profile.status',
        'profile.created_at',
        'user.id',
        'user.email',
        'user.full_name', // Tránh select password_hash
      ])
      .orderBy('profile.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('profile.status = :status', { status });
    }

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

  // [Task: S3-BE-02] Hàm duyệt/từ chối hồ sơ sử dụng Transaction
  async reviewProfile(
    adminId: string,
    profileId: string,
    reviewDto: ReviewTeacherProfileDto,
  ) {
    // Bắt buộc query relations 'user' để có object cập nhật Role
    const profile = await this.teacherProfileRepo.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ giáo viên.');
    }

    if (profile.status !== TeacherProfileStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Không thể xử lý. Hồ sơ này đã ở trạng thái: ${profile.status}.`,
      );
    }

    // [Task: S3-BE-02] Khởi tạo Transaction bằng QueryRunner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cập nhật trạng thái Profile
      profile.status = reviewDto.status;
      await queryRunner.manager.save(TeacherProfile, profile);

      // 2. Nếu Admin Duyệt -> Cập nhật Role cho User
      if (reviewDto.status === TeacherProfileStatus.APPROVED) {
        // Lưu ý: Đảm bảo bảng users của bạn dùng trường 'role'
        profile.user.role = UserRole.TEACHER;
        await queryRunner.manager.save(User, profile.user);
      }

      // 3. Xác nhận thay đổi (Commit)
      await queryRunner.commitTransaction();

      // [Task: S3-BE-03] Ghi Audit Log sau khi commit thành công
      // Gọi fire-and-forget (không cần await) để không làm chậm response trả về cho Admin.
      // AuditService (từ S1-BE-01) đã được thiết kế tự bắt lỗi nội bộ (try-catch) nên không sợ văng lỗi làm crash app.
      this.auditService
        .log({
          action: 'REVIEW_TEACHER_PROFILE',
          actorId: adminId, // Admin ID đang thao tác
          targetId: profile.user.id, // User ID của người nộp hồ sơ
          details: {
            profile_id: profile.id,
            old_status: TeacherProfileStatus.PENDING_REVIEW,
            new_status: reviewDto.status,
            assigned_role:
              reviewDto.status === TeacherProfileStatus.APPROVED
                ? 'TEACHER'
                : 'USER',
          },
          ip: undefined, // Có thể truyền IP nếu lấy được từ request (tùy chọn)
          userAgent: undefined, // Tùy chọn
        })
        .catch((err) => console.error('Lỗi khi ghi Audit Log:', err));

      return profile;
    } catch (error) {
      // NẾu có lỗi (như đứt kết nối DB giữa chừng) -> Hủy bỏ mọi thay đổi (Rollback)
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối
      await queryRunner.release();
    }
  }

  // [Task: S3-BE-01] Lấy profile của user hiện tại (kèm user info)
  async getMyProfile(userId: string) {
    const profile = await this.teacherProfileRepo.findOne({
      where: { userId },
      relations: ['user'],
      select: {
        id: true,
        bio: true,
        expertise: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    });

    if (!profile) {
      return null;
    }

    return profile;
  }

  async findByUserId(userId: string) {
    return this.teacherProfileRepo.findOne({
      where: { userId },
      relations: ['user'],
      select: {
        id: true,
        bio: true,
        expertise: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        user: { id: true, fullName: true, email: true, avatarUrl: true },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateTeacherProfileDto) {
    const profile = await this.teacherProfileRepo.findOne({
      where: { userId },
    });
    if (!profile)
      throw new NotFoundException('Hồ sơ chưa được tạo, vui lòng nộp mới');
    if (profile.status !== TeacherProfileStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Chỉ có thể cập nhật khi hồ sơ đang chờ duyệt',
      );
    }
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.expertise !== undefined) profile.expertise = dto.expertise;
    return this.teacherProfileRepo.save(profile);
  }

  async deleteProfile(profileId: string, adminId: string) {
    const profile = await this.teacherProfileRepo.findOne({
      where: { id: profileId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Hồ sơ không tồn tại');
    await this.teacherProfileRepo.delete(profileId);
    // Audit log
    this.auditService.log({
      action: 'DELETE_TEACHER_PROFILE',
      actorId: adminId,
      targetId: profile.userId,
      details: { profileId, userEmail: profile.user?.email },
    });
    return { success: true };
  }
}
