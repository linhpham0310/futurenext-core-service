import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  Delete,
  Param,
  Post,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import { AuthService } from '../../auth/services/auth.service';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

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

  @Get('reviews')
  async getMyReviews(@Request() req) {
    return this.prisma.review.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('reviews')
  async createReview(
    @Request() req,
    @Body() body: { courseId: string; rating: number; comment?: string },
  ) {
    const purchase = await this.prisma.purchase.findUnique({
      where: {
        userId_courseId: { userId: req.user.sub, courseId: body.courseId },
      },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');
    return this.prisma.review.create({
      data: {
        userId: req.user.sub,
        courseId: body.courseId,
        rating: body.rating,
        comment: body.comment,
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
