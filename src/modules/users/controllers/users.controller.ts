// src/modules/users/controllers/users.controller.ts
import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole, UserStatus } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { TeacherProfilesService } from '../services/teacher-profiles.service';
import { AuthService } from '../../auth/services/auth.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import {
  SubmitTeacherProfileDto,
  UpdateTeacherProfileDto,
} from '../dto/teacher-profile.dto';
import { GetTeacherProfilesFilterDto } from '../dto/admin-teacher-profile.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserFullDto } from '../dto/update-user-full.dto';
import { UpdateStudentStatusDto } from '../dto/update-student-status.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { TeacherProfileStatus } from '../entities/teacher-profile.entity';

// ==================== 1. USER CONTROLLER (Profile, self-management) ====================
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.findProfileById(userId);
  }

  @Put('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // Example admin-only test endpoint (có thể bỏ nếu không cần)
  @Get('admin/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminOnlyEndpoint(@CurrentUser() user: any) {
    return { message: `Welcome Admin ${user.sub}!` };
  }
}

// ==================== 2. ADMIN USER CONTROLLER (Quản lý người dùng) ====================
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findProfileById(id);
  }

  @Put(':id/role')
  async updateUserRole(
    @Param('id') targetUserId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const actionById = req.user.sub;
    await this.usersService.updateRole(
      targetUserId,
      updateRoleDto.role,
      actionById,
      ip,
    );
    return { message: 'Cập nhật vai trò người dùng thành công.' };
  }

  @Patch(':id')
  async updateUserPartial(
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
    if (dto.role && dto.role !== UserRole.STUDENT) {
      throw new BadRequestException(
        'Không thể đổi role của học viên qua endpoint này',
      );
    }
    return this.usersService.updateUserFull(id, dto, req.user.sub, ip);
  }

  @Delete('students/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudent(@Param('id') id: string, @Req() req, @Ip() ip: string) {
    await this.usersService.deleteUser(id, req.user.sub, ip);
  }
}

// ==================== 3. TEACHER PROFILES CONTROLLER (Nộp hồ sơ, xem profile) ====================
@Controller('teacher-profiles')
@UseGuards(JwtAuthGuard)
export class TeacherProfilesController {
  constructor(
    private readonly teacherProfilesService: TeacherProfilesService,
  ) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitProfile(@Request() req, @Body() dto: SubmitTeacherProfileDto) {
    const userId = req.user.sub;
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

  @Put('update')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() dto: UpdateTeacherProfileDto) {
    const userId = req.user.sub;
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

  @Get('my-profile')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Request() req) {
    const userId = req.user.sub;
    const profile = await this.teacherProfilesService.findByUserId(userId);
    return { success: true, data: profile };
  }
}

// ==================== 4. ADMIN TEACHER PROFILES CONTROLLER (Duyệt hồ sơ) ====================
@Controller('admin/teacher-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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

  @Delete(':id')
  async deleteProfile(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub;
    return this.teacherProfilesService.deleteProfile(id, adminId);
  }

  @Patch(':id/approve')
  async approveProfile(@Param('id') id: string, @Request() req) {
    const result = await this.teacherProfilesService.reviewProfile(
      req.user.sub,
      id,
      {
        status: TeacherProfileStatus.APPROVED,
      },
    );
    return result;
  }

  @Patch(':id/reject')
  async rejectProfile(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const result = await this.teacherProfilesService.reviewProfile(
      req.user.sub,
      id,
      {
        status: TeacherProfileStatus.REJECTED,
        reason,
      },
    );
    return result;
  }
}

// ==================== 5. STUDENT CONTROLLER (Học viên: profile, favorites, reviews, notifications) ====================
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // Profile & Password
  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.findProfileById(req.user.sub);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto);
  }

  // Favorites
  @Get('favorites')
  async getFavorites(@Request() req) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: req.user.sub },
      include: { course: true },
    });
    return favorites.map((f) => f.course);
  }

  @Post('favorites/:courseId')
  async addFavorite(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.favorite.upsert({
      where: { userId_courseId: { userId: req.user.sub, courseId } },
      update: {},
      create: { userId: req.user.sub, courseId },
    });
    return { message: 'Added to favorites' };
  }

  @Delete('favorites/:courseId')
  async removeFavorite(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.favorite.deleteMany({
      where: { userId: req.user.sub, courseId },
    });
    return { message: 'Removed from favorites' };
  }

  // Reviews
  @Get('reviews')
  async getMyReviews(@Request() req) {
    return this.prisma.review.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId: req.user.sub, courseId: dto.courseId },
      },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    return this.prisma.review.create({
      data: {
        userId: req.user.sub,
        courseId: dto.courseId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  @Delete('reviews/:reviewId')
  async deleteReview(@Param('reviewId') reviewId: string, @Request() req) {
    await this.prisma.review.deleteMany({
      where: { id: reviewId, userId: req.user.sub },
    });
    return { message: 'Review deleted' };
  }

  // Notifications
  @Get('notifications')
  async getNotifications(@Request() req, @Query('limit') limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  @Patch('notifications/:id/read')
  async markRead(@Param('id') id: string, @Request() req) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.sub },
      data: { isRead: true },
    });
    return { message: 'Marked as read' };
  }
}
