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
  Patch,
  Delete,
  BadRequestException,
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
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserFullDto } from './dto/update-user-full.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';

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
    const actionById = req.user.sub;

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

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findProfileById(id);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateUserPartial(id, dto, req.user.sub, ip);
  }

  @Put(':id')
  async updateUserFull(
    @Param('id') id: string,
    @Body() dto: UpdateUserFullDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateUserFull(id, dto, req.user.sub, ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string, @Req() req, @Ip() ip: string) {
    await this.usersService.deleteUser(id, req.user.sub, ip);
  }

  // Student management
  @Get('students')
  async getStudents(@Query() query: UserQueryDto) {
    return this.usersService.findStudents(query);
  }

  @Get('students/:id')
  async getStudentById(@Param('id') id: string) {
    return this.usersService.findStudentDetail(id);
  }

  @Patch('students/:id/status')
  async updateStudentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    return this.usersService.updateStudentStatus(
      id,
      dto.status,
      req.user.sub,
      ip,
    );
  }

  @Put('students/:id')
  async updateStudent(
    @Param('id') id: string,
    @Body() dto: UpdateUserFullDto,
    @Req() req,
    @Ip() ip: string,
  ) {
    // Chỉ cho phép update student role? Có thể giữ nguyên role STUDENT
    if (dto.role && dto.role !== UserRole.STUDENT) {
      throw new BadRequestException(
        'Không thể đổi role của học viên qua endpoint này',
      );
    }
    return this.usersService.updateUserFull(id, dto, req.user.sub, ip);
  }

  @Delete('students/:id')
  async deleteStudent(@Param('id') id: string, @Req() req, @Ip() ip: string) {
    await this.usersService.deleteUser(id, req.user.sub, ip);
  }
}
