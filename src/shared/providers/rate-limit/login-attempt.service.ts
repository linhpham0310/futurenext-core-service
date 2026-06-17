import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoginAttemptService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined in environment');
    }
    this.redis = new Redis(redisUrl);
  }

  async incrementFailure(email: string): Promise<number> {
    const key = `login-failures:${email}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, 15 * 60);
    }
    return attempts;
  }

  async checkLockout(email: string, limit = 10): Promise<boolean> {
    const key = `login-failures:${email}`;
    const attempts = await this.redis.get(key);
    return attempts !== null && parseInt(attempts) >= limit;
  }

  async resetFailures(email: string): Promise<void> {
    await this.redis.del(`login-failures:${email}`);
  }
}
