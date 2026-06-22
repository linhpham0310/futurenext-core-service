import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HashingService {
  private readonly logger = new Logger(HashingService.name);
  private readonly saltRounds: number;

  constructor(private readonly configService: ConfigService) {
    // Đọc và ép kiểu rõ ràng, đảm bảo là số nguyên dương
    const raw = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10');
    this.saltRounds = parseInt(raw, 10);
    if (isNaN(this.saltRounds) || this.saltRounds < 1) {
      this.saltRounds = 10;
    }
    this.logger.log(`Initialized with salt rounds: ${this.saltRounds}`);
  }

  async hash(plainText: string): Promise<string> {
    try {
      // Cách an toàn: tạo salt trước
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(plainText, salt);
    } catch (error) {
      this.logger.error('Error hashing text:', error.stack);
      throw new InternalServerErrorException('Failed to process password.');
    }
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    if (!hash) {
      this.logger.warn(
        'Attempted to compare against a null or undefined hash.',
      );
      return false;
    }
    try {
      return await bcrypt.compare(plainText, hash);
    } catch (error) {
      this.logger.error('Error comparing text with hash:', error.stack);
      throw new InternalServerErrorException('Failed to verify password.');
    }
  }
}
