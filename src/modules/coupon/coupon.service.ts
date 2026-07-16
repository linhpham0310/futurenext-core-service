import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async applyCoupon(code: string, userId: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code, isActive: true },
    });
    if (!coupon) throw new NotFoundException('Mã giảm giá không hợp lệ');
    if (coupon.expiresAt < new Date())
      throw new BadRequestException('Mã đã hết hạn');
    if (coupon.usedCount >= coupon.maxUses)
      throw new BadRequestException('Mã đã hết lượt sử dụng');

    const used = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (coupon.perUserLimit && used >= coupon.perUserLimit) {
      throw new BadRequestException('Bạn đã sử dụng mã này');
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = (subtotal * coupon.discountValue) / 100;
    } else {
      // FIXED_AMOUNT
      discount = coupon.discountValue;
    }
    // Không cho discount vượt quá subtotal
    if (discount > subtotal) discount = subtotal;

    return {
      code: coupon.code,
      type: coupon.type,
      discount: Math.round(discount),
      description: coupon.description,
    };
  }
}
