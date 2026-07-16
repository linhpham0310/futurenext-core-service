import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    userId: string,
    data: { courseId: string; rating: number; comment?: string },
  ) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: data.courseId } },
    });
    if (!purchase)
      throw new ForbiddenException('Bạn chưa đăng ký khóa học này');

    return this.prisma.review.create({
      data: {
        userId,
        courseId: data.courseId,
        rating: data.rating,
        comment: data.comment,
      },
    });
  }

  async getCourseReviews(courseId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    // Lấy tên user từ entityManager (TypeORM)
    // Giả định có thể join, nhưng đơn giản hóa
    return reviews;
  }

  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReview(
    userId: string,
    reviewId: string,
    data: { rating: number; comment?: string },
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId, userId },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.update({
      where: { id: reviewId },
      data,
    });
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId, userId },
    });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.prisma.review.delete({ where: { id: reviewId } });
  }
}
