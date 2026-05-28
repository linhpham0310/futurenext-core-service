import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
// Import RolesGuard, DTOs khi cần

@Controller('users') // Sẽ có prefix cụ thể hơn cho từng route sau này (vd: @Controller('me'), @Controller('admin/users'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Endpoints sẽ triển khai ở Sprint 1-3 ---
  // Ví dụ:
  // @Get('me/profile')
  // @UseGuards(JwtAuthGuard)
  // async getProfile(@Request() req) { /* ... */ }

  // @Put('me/profile')
  // @UseGuards(JwtAuthGuard)
  // async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) { /* ... */ }

  // @Get('/admin') // Ví dụ endpoint cho admin
  // @UseGuards(JwtAuthGuard, RolesGuard) // Kết hợp 2 guards
  // @Roles(UserRole.ADMIN) // Decorator custom để chỉ định role (sẽ tạo sau)
  // async findUsers(@Query() query: FindUsersQueryDto) { /* ... */ }
}
