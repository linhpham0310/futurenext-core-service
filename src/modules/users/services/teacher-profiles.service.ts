// [Task: S3-BE-01] Service xử lý nghiệp vụ cho Teacher Profile
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherProfile } from '../entities/teacher-profile.entity'; // Entity từ Task DB
import { User } from '../entities/user.entity'; // Entity cũ
import {
  SubmitTeacherProfileDto,
  UpdateTeacherProfileDto,
} from '../dto/teacher-profile.dto';

@Injectable()
export class TeacherProfilesService {
  constructor(
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepo: Repository<TeacherProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // [Task: S3-BE-01] Logic nộp hồ sơ mới
  async submitProfile(
    userId: string,
    dto: SubmitTeacherProfileDto,
  ): Promise<TeacherProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng hợp lệ.');
    }

    // Kiểm tra xem user này đã nộp hồ sơ chưa (tránh spam)
    const existingProfile = await this.teacherProfileRepo.findOne({
      where: { userId: userId },
    });
    if (existingProfile) {
      throw new ConflictException(
        'Hồ sơ giáo viên của bạn đã tồn tại. Vui lòng sử dụng chức năng cập nhật.',
      );
    }

    // Khởi tạo profile (Status mặc định là PENDING từ DB)
    const newProfile = this.teacherProfileRepo.create({
      userId: userId,
      bio: dto.bio,
      expertise: dto.expertise,
    });

    return await this.teacherProfileRepo.save(newProfile);
  }

  // [Task: S3-BE-01] Logic cập nhật hồ sơ
  async updateProfile(
    userId: string,
    dto: UpdateTeacherProfileDto,
  ): Promise<TeacherProfile> {
    const profile = await this.teacherProfileRepo.findOne({
      where: { userId: userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ giáo viên để cập nhật. Vui lòng nộp mới trước.',
      );
    }

    // Business Rule: Chỉ cho phép sửa hồ sơ khi đang chờ duyệt
    if (profile.status !== 'pending_review') {
      throw new BadRequestException(
        'Chỉ có thể cập nhật hồ sơ khi đang ở trạng thái chờ duyệt (PENDING).',
      );
    }

    // Merge dữ liệu mới vào dữ liệu cũ
    const updatedProfile = this.teacherProfileRepo.merge(profile, dto);
    return await this.teacherProfileRepo.save(updatedProfile);
  }
}
