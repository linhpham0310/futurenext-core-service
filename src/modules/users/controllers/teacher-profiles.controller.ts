// [Task: S3-BE-01] Controller quản lý các API liên quan đến Teacher Profile của User
import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeacherProfilesService } from '../services/teacher-profiles.service';
import {
  SubmitTeacherProfileDto,
  UpdateTeacherProfileDto,
} from '../dto/teacher-profile.dto';

// Import JwtAuthGuard từ module auth (Lưu ý: điều chỉnh đường dẫn tương đối cho khớp với cấu trúc thực tế của bạn)
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/teacher-profiles')
@UseGuards(JwtAuthGuard) // [Task: S3-BE-01] Bắt buộc đăng nhập để gọi các API này
export class TeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  // [Task: S3-BE-01] API: POST /api/teacher-profiles/submit
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitProfile(@Request() req, @Body() dto: SubmitTeacherProfileDto) {
    const userId = req.user.id; // Lấy ID từ token đã được Guard giải mã
    const profile = await this.teacherProfilesService.submitProfile(
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Nộp hồ sơ giáo viên thành công',
      data: profile,
    };
  }

  // [Task: S3-BE-01] API: PUT /api/teacher-profiles/update
  @Put('update')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() dto: UpdateTeacherProfileDto) {
    const userId = req.user.id;
    const profile = await this.teacherProfilesService.updateProfile(
      userId,
      dto,
    );
    return {
      success: true,
      message: 'Cập nhật hồ sơ giáo viên thành công',
      data: profile,
    };
  }
}
