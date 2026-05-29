import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Ip,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

// --- IMPORT TỪ SPRINT 1 ---
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from './entities/user.entity';

import { UserQueryDto } from './dto/user-query.dto'; // Từ Task S2-BE-04
import { UpdateRoleDto } from './dto/update-role.dto'; // Từ Task S2-BE-05
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UsersService } from './services/users.service';

/**
 * [Task: S2-BE-06] Triển khai Users Admin Controller
 * Cấu hình bảo mật tầng Controller: Bắt buộc Login (JwtAuthGuard) & Bắt buộc là Admin (RolesGuard)
 */
@ApiTags('Admin / Users') // Nhóm API trên Swagger
@ApiBearerAuth() // Yêu cầu gắn token trên Swagger
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * [Task: S2-BE-06] Endpoint 1: Lấy danh sách người dùng
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách người dùng (Có phân trang, lọc, tìm kiếm)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách người dùng thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Không có quyền Admin.',
  })
  async getAllUsers(@Query() query: UserQueryDto) {
    // Chuyển tiếp query đã được validate (nhờ ValidationPipe global) xuống Service
    return this.usersService.findAll(query);
  }

  /**
   * [Task: S2-BE-06] Endpoint 2: Cập nhật quyền người dùng
   */
  @Put(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật vai trò (Role) của người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Dữ liệu sai hoặc vi phạm logic Admin cuối cùng.',
  })
  @ApiResponse({ status: 404, description: 'Not Found - User không tồn tại.' })
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: any, // Express Request object
    @Ip() ip: string,
  ) {
    // Lấy ID của Admin đang thực hiện request từ token (JwtStrategy đã đính kèm vào req.user)
    const actionById = req.user.id;

    // Gọi logic xử lý và ghi log đã viết ở S2-BE-05
    await this.usersService.updateRole(
      targetUserId,
      updateRoleDto.role,
      actionById,
      ip,
    );

    return {
      message: 'Cập nhật vai trò người dùng thành công.',
    };
  }
}
