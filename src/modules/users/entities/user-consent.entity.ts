// src/modules/users/entities/user-consent.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn, // Chỉ cần CreateDateColumn, không cần UpdateDateColumn
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Đại diện cho bảng 'user_consents'.
 * Ghi lại bằng chứng về việc người dùng đồng ý với một phiên bản cụ thể
 * của Điều khoản dịch vụ hoặc Chính sách bảo mật.
 */
@Entity('user_consents') // Ánh xạ tới bảng 'user_consents'
export class UserConsent {
  /**
   * Khóa chính duy nhất cho mỗi bản ghi đồng ý.
   */
  @PrimaryGeneratedColumn('uuid') // Khóa chính UUID [cite: 1592]
  id: string;

  /**
   * Khóa ngoại liên kết đến người dùng đã đưa ra sự đồng ý.
   */
  @Column({ type: 'uuid' }) // Khóa ngoại tới users.id [cite: 1593]
  @Index() // Index để tìm consent theo user
  userId: string;

  /**
   * Phiên bản của tài liệu (ví dụ: Điều khoản dịch vụ) mà người dùng đã đồng ý.
   * Nên có định dạng nhất quán (ví dụ: 'tos_v2.1', 'privacy_v2025-10-26').
   */
  @Column({ type: 'text' }) // Lưu phiên bản consent [cite: 1594]
  consentVersion: string;

  /**
   * Thời điểm chính xác người dùng đưa ra sự đồng ý.
   * **QUAN TRỌNG:** Giá trị này nên được lấy từ server tại thời điểm ghi nhận, không phải từ client.
   */
  @Column({ type: 'timestamptz' }) // Thời điểm đồng ý [cite: 1595]
  consentTimestamp: Date;

  /**
   * Địa chỉ IP của người dùng tại thời điểm đồng ý (nếu có thể thu thập).
   * Cung cấp thêm bằng chứng.
   */
  @Column({ type: 'inet', nullable: true }) // Kiểu inet, cho phép null [cite: 1598]
  ipAddress: string | null;

  /**
   * Chuỗi User Agent của trình duyệt/client tại thời điểm đồng ý (nếu có thể thu thập).
   * Cung cấp thêm bằng chứng.
   */
  @Column({ type: 'text', nullable: true }) // Kiểu text, cho phép null [cite: 1599]
  userAgent: string | null;

  /**
   * Thời điểm bản ghi này được tạo trong CSDL.
   */
  @CreateDateColumn({ type: 'timestamptz' }) // Thời điểm tạo bản ghi [cite: 1600]
  createdAt: Date;

  // --- Định nghĩa Quan hệ ManyToOne ---
  /**
   * Quan hệ Nhiều-Một: Nhiều bản ghi consent có thể thuộc về một User.
   * onDelete: 'CASCADE': Nếu User bị xóa, các bản ghi consent cũng xóa theo.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // Chỉ định khóa ngoại [cite: 1593]
  user: User;
}
