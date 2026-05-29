// src/modules/users/controllers/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User, UserRole } from '../entities/user.entity';
import { RolesGuard } from '@/shared/guards/roles.guard'; // Import cho ví dụ
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('users') // Thay đổi base path thành 'users' cho rõ ràng hơn
@UseGuards(JwtAuthGuard) // <<<--- ÁP DỤNG JWT GUARD CHO TOÀN BỘ CONTROLLER
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile') // Endpoint giờ là GET /users/me/profile
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser('sub') userId: string, // <<<--- SỬ DỤNG @CurrentUser
  ): Promise<Partial<User>> {
    this.logger.log(`GET /users/me/profile request for user ID: ${userId}`);
    return this.usersService.findProfileById(userId);
  }

  @Put('me/profile') // Endpoint giờ là PUT /users/me/profile
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') userId: string, // <<<--- SỬ DỤNG @CurrentUser
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    this.logger.log(`PUT /users/me/profile request for user ID: ${userId}`);
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  // --- VÍ DỤ CHO SPRINT 2 ---
  // @Get('admin/test') // GET /users/admin/test
  // @UseGuards(RolesGuard) // Áp dụng RolesGuard sau JwtAuthGuard
  // @Roles(UserRole.ADMIN) // Chỉ định chỉ ADMIN được truy cập
  // adminOnlyEndpoint(@CurrentUser() user: any) {
  //     this.logger.log(`Admin endpoint accessed by user: ${user.sub}`);
  //     return { message: `Welcome Admin ${user.sub}!`};
  // }
}
