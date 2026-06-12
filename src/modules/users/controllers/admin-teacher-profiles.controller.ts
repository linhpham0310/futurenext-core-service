// [Task: S3-BE-02] Khởi tạo Controller xử lý API cho Admin
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { TeacherProfilesService } from '../services/teacher-profiles.service';
import {
  GetTeacherProfilesFilterDto,
  ReviewTeacherProfileDto,
} from '../dto/admin-teacher-profile.dto';

// Import JwtAuthGuard (Điều chỉnh đường dẫn theo dự án của bạn)
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';
// Nếu bạn đã làm RolesGuard ở Sprint 1, có thể uncomment:
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin/teacher-profiles')
@UseGuards(JwtAuthGuard) // [Task: S3-BE-02] Bắt buộc đăng nhập
// @UseGuards(RolesGuard)
// @Roles('ADMIN')
export class AdminTeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  @Get()
  async getProfiles(@Query() filterDto: GetTeacherProfilesFilterDto) {
    const result = await this.teacherProfilesService.findAllForAdmin(filterDto);
    return {
      success: true,
      message: 'Lấy danh sách hồ sơ giáo viên thành công.',
      data: result,
    };
  }

  @Patch(':id/approve')
  async approveProfile(@Param('id') id: string, @Request() req) {
    return this.teacherProfilesService.reviewProfile(req.user.sub, id, {
      status: TeacherProfileStatus.APPROVED,
    });
  }

  @Patch(':id/reject')
  async rejectProfile(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    // Có thể lưu reason vào DB nếu cần
    return this.teacherProfilesService.reviewProfile(req.user.sub, id, {
      status: TeacherProfileStatus.REJECTED,
      reason,
    });
  }
}
