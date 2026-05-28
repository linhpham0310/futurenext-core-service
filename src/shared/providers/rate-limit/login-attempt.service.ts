import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class LoginAttemptService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASS || undefined,
    });
  }

  // Tăng số lần login thất bại, trả về số lần mới
  async incrementFailure(email: string): Promise<number> {
    const key = `login-failures:${email}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      // TTL 15 phút
      await this.redis.expire(key, 15 * 60);
    }
    return attempts;
  }

  // Kiểm tra email có bị lock chưa
  async checkLockout(email: string, limit = 10): Promise<boolean> {
    const key = `login-failures:${email}`;
    const attempts = await this.redis.get(key);
    return attempts !== null && parseInt(attempts) >= limit;
  }

  // Reset bộ đếm khi login thành công hoặc khóa account
  async resetFailures(email: string): Promise<void> {
    const key = `login-failures:${email}`;
    await this.redis.del(key);
  }
}
