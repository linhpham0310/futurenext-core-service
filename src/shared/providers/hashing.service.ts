// src/shared/providers/hashing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt'; // Import thư viện bcrypt đã cài đặt

/**
 * Service dùng chung để xử lý mã hóa và so sánh mật khẩu.
 * Sử dụng bcrypt làm thuật toán hash mặc định.
 * Được đánh dấu là Global trong SharedModule để có thể inject bất cứ đâu.
 */
@Injectable() // Đánh dấu class này là một NestJS Provider
export class HashingService {
  private readonly logger = new Logger(HashingService.name);
  // ✅ Cấu hình độ phức tạp (salt rounds) cho bcrypt. Giá trị cao hơn an toàn hơn nhưng chậm hơn.
  // 10-12 là giá trị cân bằng phổ biến. Có thể đọc từ ConfigService nếu muốn.
  private readonly saltRounds: number = 10;

  constructor() {
    this.logger.log(`Initialized with salt rounds: ${this.saltRounds}`);
  }

  /**
   * Mã hóa một chuỗi văn bản gốc (ví dụ: mật khẩu) sử dụng bcrypt.
   * @param plainText Chuỗi cần mã hóa.
   * @returns Promise chứa chuỗi hash đã được mã hóa.
   */
  async hash(plainText: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds); // Tạo salt ngẫu nhiên
      const hashedText = await bcrypt.hash(plainText, salt); // Hash với salt
      return hashedText;
    } catch (error) {
      this.logger.error(`Error hashing text: ${error.message}`, error.stack);
      throw error; // Ném lại lỗi để tầng trên xử lý
    }
  }

  /**
   * So sánh một chuỗi văn bản gốc với một chuỗi hash (đã được tạo bởi hàm hash).
   * @param plainText Chuỗi gốc cần so sánh.
   * @param hash Chuỗi hash để so sánh.
   * @returns Promise chứa giá trị boolean: true nếu khớp, false nếu không khớp.
   */
  async compare(plainText: string, hash: string): Promise<boolean> {
    try {
      // Hàm compare của bcrypt đã bao gồm việc trích xuất salt từ hash
      const isMatch = await bcrypt.compare(plainText, hash);
      return isMatch;
    } catch (error) {
      // Lỗi có thể xảy ra nếu hash không đúng định dạng bcrypt
      this.logger.error(
        `Error comparing text with hash: ${error.message}`,
        error.stack,
      );
      // Trong trường hợp lỗi (ví dụ hash không hợp lệ), nên trả về false thay vì ném lỗi ra ngoài
      // để tránh lộ thông tin về định dạng hash nội bộ.
      return false;
    }
  }
}
