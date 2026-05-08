// src/modules/users/entities/user-credential.entity.ts
import {
  Entity,
  PrimaryColumn, // Sử dụng PrimaryColumn vì khóa chính cũng là khóa ngoại
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity'; // Import User để tạo quan hệ

/**
 * Đại diện cho bảng 'user_credentials'.
 * Lưu trữ thông tin xác thực nhạy cảm (hash mật khẩu) của người dùng,
 * tách biệt khỏi thông tin hồ sơ chính trong bảng 'users'.
 */
@Entity('user_credentials') // Ánh xạ tới bảng 'user_credentials'
export class UserCredential {
  /**
   * Khóa chính của bảng này, đồng thời là khóa ngoại tham chiếu đến 'users.id'.
   * Sử dụng @PrimaryColumn thay vì @PrimaryGeneratedColumn.
   */
  @PrimaryColumn({ type: 'uuid' }) // Khóa chính là userId [cite: 1552]
  userId: string;

  /**
   * Chuỗi hash của mật khẩu người dùng (ví dụ: sử dụng bcrypt).
   * **KHÔNG BAO GIỜ** lưu mật khẩu gốc.
   */
  @Column({ type: 'text' }) // Kiểu text đủ lớn cho hash [cite: 1553]
  passwordHash: string;

  /**
   * Thuật toán đã sử dụng để hash mật khẩu (ví dụ: 'bcrypt').
   * Hữu ích nếu sau này muốn nâng cấp thuật toán hash.
   */
  @Column({ type: 'text', default: 'bcrypt' }) // Mặc định là bcrypt [cite: 1554]
  passwordAlgo: string;

  /**
   * Thời điểm mật khẩu được cập nhật lần cuối.
   * Hữu ích cho các chính sách yêu cầu đổi mật khẩu định kỳ.
   */
  @UpdateDateColumn({ type: 'timestamptz', name: 'password_updated_at' }) // Tự động cập nhật khi passwordHash thay đổi? Cần kiểm tra lại TypeORM behavior hoặc cập nhật thủ công. LLD dùng default now() [cite: 1555] nên có thể cần logic riêng hoặc trigger DB.
  passwordUpdatedAt: Date; // Tên cột trong DB là password_updated_at [cite: 1555]

  /**
   * Cờ đánh dấu liệu người dùng có cần phải đổi mật khẩu ở lần đăng nhập tiếp theo không.
   * Hữu ích cho admin khi reset mật khẩu hoặc chính sách bảo mật.
   */
  @Column({ type: 'boolean', default: false }) // Mặc định là false [cite: 1556]
  mustChangePassword: boolean;

  // --- Định nghĩa Quan hệ OneToOne ---
  /**
   * Quan hệ Một-Một: Mỗi UserCredential thuộc về đúng một User.
   * onDelete: 'CASCADE': Nếu User bị xóa, credential cũng bị xóa theo.
   */
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // Chỉ định cột khóa ngoại/chính là 'userId' [cite: 1552]
  user: User; // Thuộc tính để truy cập đối tượng User từ UserCredential
}
