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
// Nếu bạn đã làm RolesGuard ở Sprint 1, có thể uncomment:
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('api/admin/teacher-profiles')
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

  @Patch(':id/review')
  async reviewProfile(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string, // Đảm bảo ID truyền vào là chuẩn UUID
    @Body() reviewDto: ReviewTeacherProfileDto,
  ) {
    const adminId = req.user.id;

    const profile = await this.teacherProfilesService.reviewProfile(
      adminId,
      id,
      reviewDto,
    );
    return {
      success: true,
      message: `Đã xử lý hồ sơ thành công. Trạng thái: ${profile.status}`,
      data: {
        id: profile.id,
        status: profile.status,
        updated_at: profile.updatedAt,
      },
    };
  }
}
