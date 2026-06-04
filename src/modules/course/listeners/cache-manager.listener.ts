import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
@Injectable()
export class CacheManagerListener {
  private readonly logger = new Logger(CacheManagerListener.name);
  constructor(@InjectRedis() private readonly redis: Redis) {}
  /**
   * TASK S4-CM-04: TỰ ĐỘNG XÓA CACHE KHI KHÓA HỌC XUẤT BẢN
   * Lắng nghe sự kiện từ Task 4.3
   */
  @OnEvent('course.published')
  async handleCoursePublished(payload: any) {
    this.logger.log(
      `[Cache Invalidation] Đang xóa cache danh sách khóa học do khóa học "${payload.title}" vừa được xuất bản.`,
    );
    try {
      // 1. Xóa cache danh sách khóa học công khai cho học viên
      // Key này thường dùng cho trang chủ hoặc trang tìm kiếm
      await this.redis.del('cache:courses:public_list');
      // 2. Xóa cache chi tiết khóa học (nếu có)
      await this.redis.del(`cache:courses:detail:${payload.courseId}`);
      this.logger.log(
        `[Cache Invalidation] Thành công: Đã dọn dẹp Redis cho Course ID: ${payload.courseId}`,
      );
    } catch (error) {
      this.logger.error(
        `[Cache Invalidation] Lỗi khi xóa Redis: ${error.message}`,
      );
    }
  }
}
