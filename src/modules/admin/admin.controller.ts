import {
  Controller,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('activities/recent')
  async getRecentActivities(@Query('limit') limit = 10) {
    return this.adminService.getRecentActivities(+limit);
  }

  // Users management
  @Get('users')
  async getAllUsers(@Query() query: any) {
    return this.adminService.getAllUsers(query);
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  // Courses management
  @Get('courses')
  async getAllCourses(@Query() query: any) {
    return this.adminService.getAllCourses(query);
  }

  @Get('courses/:id')
  async getCourseDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getCourseDetail(id);
  }

  @Patch('courses/:id/approve')
  async approveCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveCourse(id);
  }

  @Patch('courses/:id/reject')
  async rejectCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectCourse(id, reason);
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteCourse(id);
  }

  // Students management
  @Get('students')
  async getAllStudents(@Query() query: any) {
    return this.adminService.getAllStudents(query);
  }

  @Get('students/:id')
  async getStudentDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getStudentDetail(id);
  }

  @Patch('students/:id')
  async updateStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.adminService.updateStudent(id, data);
  }

  @Patch('students/:id/status')
  async toggleStudentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.toggleStudentStatus(id, status);
  }

  @Delete('students/:id')
  async deleteStudent(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteStudent(id);
  }

  // Revenue
  @Get('revenue/stats')
  async getRevenueStats() {
    return this.adminService.getRevenueStats();
  }

  @Get('revenue/transactions')
  async getTransactions(@Query('limit') limit = 20) {
    return this.adminService.getTransactions(+limit);
  }

  // Teacher profiles (đã có trong AdminTeacherProfilesController, nhưng thêm vào đây cho đồng bộ)
  @Get('teacher-profiles')
  async getTeacherProfiles(@Query() query: any) {
    return this.adminService.getTeacherProfiles(query);
  }

  @Patch('teacher-profiles/:id/review')
  async reviewTeacherProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.adminService.reviewTeacherProfile(id, body.status, body.reason);
  }
}
