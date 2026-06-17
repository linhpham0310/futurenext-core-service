import { Injectable } from '@nestjs/common';

@Injectable()
export class LoginAttemptService {
  // Tạm thời vô hiệu hóa Redis để tránh lỗi ECONNREFUSED
  async incrementFailure(email: string): Promise<number> {
    // Không làm gì cả
    return 1;
  }

  async checkLockout(email: string, limit = 10): Promise<boolean> {
    // Luôn trả về false (không khóa)
    return false;
  }

  async resetFailures(email: string): Promise<void> {
    // Không làm gì cả
  }
}
