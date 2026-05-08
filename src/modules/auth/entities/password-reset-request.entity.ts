// src/modules/auth/entities/password-reset-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, UserRole } from 'src/modules/users/entities/user.entity';

/**
 * Đại diện cho bảng 'password_reset_requests' trong cơ sở dữ liệu.
 * Lưu trữ thông tin về một yêu cầu đặt lại mật khẩu bằng mã OTP.
 */
@Entity('password_reset_requests') // Khai báo class ánh xạ tới bảng 'password_reset_requests' [cite: 69]
export class PasswordResetRequest {
  /**
   * Khóa chính duy nhất cho mỗi yêu cầu đặt lại mật khẩu. [cite: 71]
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Khóa ngoại liên kết đến người dùng yêu cầu đặt lại mật khẩu. [cite: 72]
   */
  @Column({ type: 'uuid' })
  @Index() // Index để tìm yêu cầu theo user
  userId: string;

  /**
   * Địa chỉ email liên kết với yêu cầu (được lưu lại để đối chiếu nếu cần). [cite: 73]
   * Dùng 'citext' để không phân biệt hoa thường.
   */
  @Column({ type: 'citext' })
  @Index() // Index để tìm yêu cầu theo email
  email: string;

  /**
   * Lưu trữ bản **HASH** của mã OTP (sử dụng bcrypt). **KHÔNG LƯU OTP GỐC.** [cite: 74]
   */
  @Column({ type: 'text' })
  codeHash: string;

  /**
   * Thời điểm mã OTP hết hạn (TTL). [cite: 75]
   * Thường có TTL ngắn hơn xác minh email (ví dụ: 15 phút).
   */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /**
   * Thời điểm mã OTP được sử dụng thành công để đặt lại mật khẩu. [cite: 76]
   * Đánh dấu OTP là đã sử dụng (single-use).
   */
  @Column({ type: 'timestamptz', nullable: true }) // Cho phép null ban đầu
  consumedAt: Date | null;

  // Có thể thêm attemptCount nếu cần chống brute-force OTP reset password

  /**
   * Thời điểm yêu cầu đặt lại mật khẩu được tạo. [cite: 77]
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // --- Định nghĩa Quan hệ ---
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // Nếu user bị xóa, các yêu cầu reset cũng xóa
  @JoinColumn({ name: 'userId' }) // Chỉ định khóa ngoại
  user: User;
}
