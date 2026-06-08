import {
  Controller,
  Post,
  Delete,
  Param,
  Get,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CreateReviewDto } from '../dto/create-review.dto';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentActionsController {
  constructor(private prisma: PrismaService) {}

  // ---------- Favorites ----------
  @Get('favorites')
  async getFavorites(@Request() req) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: req.user.sub },
      include: { course: true },
    });
    return favorites.map((f) => f.course);
  }

  @Delete('favorites/:courseId')
  async removeFavorite(@Param('courseId') courseId: string, @Request() req) {
    await this.prisma.favorite.deleteMany({
      where: { userId: req.user.sub, courseId },
    });
    return { message: 'Removed from favorites' };
  }

  // ---------- Reviews ----------
  @Post('reviews')
  async createReview(@Request() req, @Body() dto: CreateReviewDto) {
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        userId: req.user.sub,
        courseId: dto.courseId,
        status: 'COMPLETED',
      },
    });
    if (!purchase)
      throw new ForbiddenException('You must purchase this course to review');
    return this.prisma.review.create({
      data: {
        userId: req.user.sub,
        courseId: dto.courseId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  @Get('reviews')
  async getMyReviews(@Request() req) {
    return this.prisma.review.findMany({
      where: { userId: req.user.sub },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('reviews/:reviewId')
  async deleteReview(@Param('reviewId') reviewId: string, @Request() req) {
    await this.prisma.review.deleteMany({
      where: { id: reviewId, userId: req.user.sub },
    });
    return { message: 'Review deleted' };
  }
}
