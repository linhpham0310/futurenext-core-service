import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
@Injectable()
export class CourseEventListener {
  private readonly logger = new Logger(CourseEventListener.name);
  // TASK S2-CM-03: Lắng nghe sự kiện để xử lý hậu cần (Async)
  @OnEvent('section.reordered')
  handleSectionReorderedEvent(payload: any) {
    this.logger.log(
      `[Event Received] Course ${payload.courseId} đã thay đổi thứ tự chương mục.`,
    );
    // Sau này tại đây bạn sẽ gọi:
    // 1. RedisService.clearCache(payload.courseId)
    // 2. AIService.recalculateKnowledgeGraph(payload.courseId)
    console.log('Dữ liệu thứ tự mới:', payload.sections);
  }
}
