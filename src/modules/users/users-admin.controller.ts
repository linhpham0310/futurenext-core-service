import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserQueryDto } from './dto/user-query.dto';
import { UserRole } from './entities/user.entity';
import { Roles } from '@/shared/decorators/roles.decorator';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { UsersService } from './services/users.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // [BẢO MẬT] Chỉ Admin mới có quyền gọi API này
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }
  // --- [Task: S2-BE-05] PHẦN CODE THÊM MỚI ---
  @Put(':id/role')
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: any, // Request object để lấy thông tin user đang login
    @Ip() ip: string,
  ) {
    const actionById = req.user.id; // Lấy ID của Admin đang thao tác từ JWT Payload (S1)

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
