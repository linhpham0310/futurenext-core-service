import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.sub);
  }

  @Get('summary')
  async getSummary(@Request() req) {
    return this.cartService.getCartSummary(req.user.sub);
  }

  @Post(':courseId')
  async addToCart(@Param('courseId') courseId: string, @Request() req) {
    return this.cartService.addToCart(req.user.sub, courseId);
  }

  @Delete(':courseId')
  async removeFromCart(@Param('courseId') courseId: string, @Request() req) {
    return this.cartService.removeFromCart(req.user.sub, courseId);
  }
}
