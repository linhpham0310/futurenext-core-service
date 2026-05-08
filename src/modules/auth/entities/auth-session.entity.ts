// src/modules/auth/entities/auth-session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn, // Sử dụng DeleteDateColumn nếu bạn muốn soft delete, nếu không thì bỏ qua
  UpdateDateColumn, // Thêm UpdateDateColumn nếu cần theo dõi lần cập nhật cuối
} from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity'; // Import User entity để tạo quan hệ

/**
 * Đại diện cho bảng 'auth_sessions' trong cơ sở dữ liệu.
 * Lưu trữ thông tin về một phiên đăng nhập đang hoạt động, liên kết với một Refresh Token cụ thể.
 * Được sử dụng để xác thực Refresh Token, quản lý đăng xuất và thu hồi phiên.
 */
@Entity('auth_sessions') // Khai báo class này ánh xạ tới bảng 'auth_sessions'
export class AuthSession {
  /**
   * Khóa chính duy nhất cho mỗi bản ghi session, tự động tạo UUID.
   */
  @PrimaryGeneratedColumn('uuid') // Định nghĩa cột id là khóa chính, kiểu UUID, tự động tạo
  id: string;

  /**
   * Khóa ngoại liên kết đến bảng 'users', chỉ định người dùng sở hữu session này.
   * Được đánh index để tăng tốc độ truy vấn session theo user.
   */
  @Column({ type: 'uuid' }) // Định nghĩa cột userId kiểu UUID
  @Index() // Tạo index cho cột này
  userId: string;

  /**
   * Lưu trữ bản **HASH** của Refresh Token (sử dụng bcrypt hoặc thuật toán hash mạnh khác).
   * **KHÔNG BAO GIỜ** lưu trữ Refresh Token gốc. [cite: 50]
   */
  @Column({ type: 'text' }) // Định nghĩa cột refreshTokenHash kiểu text (đủ lớn cho hash)
  refreshTokenHash: string;

  /**
   * Lưu trữ vai trò (role) của người dùng tại thời điểm họ đăng nhập và tạo session này.
   * Hữu ích để kiểm tra quyền hạn mà không cần query lại bảng users mỗi lần refresh token. [cite: 51]
   */
  @Column({ type: 'text' })
  roleAtLogin: string;

  /**
   * Địa chỉ IP của client tạo ra session này (nếu có).
   * Hữu ích cho việc theo dõi và bảo mật. [cite: 52]
   */
  @Column({ type: 'inet', nullable: true }) // Kiểu dữ liệu inet cho địa chỉ IP, cho phép null
  ip: string | null;

  /**
   * Chuỗi User Agent của trình duyệt/client tạo ra session này (nếu có).
   * Hữu ích cho việc theo dõi và hiển thị thông tin session cho người dùng. [cite: 53]
   */
  @Column({ type: 'text', nullable: true }) // Kiểu text, cho phép null
  userAgent: string | null;

  /**
   * Thời điểm Refresh Token liên kết với session này sẽ hết hạn. [cite: 54]
   * Sau thời điểm này, refresh token không còn hợp lệ.
   */
  @Column({ type: 'timestamptz' }) // Kiểu timestamp with time zone
  expiresAt: Date;

  /**
   * Thời điểm session này bị thu hồi (ví dụ: do người dùng đăng xuất, đổi mật khẩu, hoặc bị tấn công). [cite: 55]
   * Nếu cột này có giá trị (khác null), refresh token không còn hợp lệ ngay cả khi chưa đến expiresAt.
   */
  @Column({ type: 'timestamptz', nullable: true }) // Cho phép null
  revokedAt: Date | null;

  /**
   * Thời điểm bản ghi session này được tạo. Tự động quản lý bởi TypeORM. [cite: 56]
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // --- Định nghĩa Quan hệ (Relationship) ---

  /**
   * Quan hệ Many-to-One: Nhiều session thuộc về một User.
   * onDelete: 'CASCADE': Nếu User bị xóa, tất cả các session liên quan cũng sẽ tự động bị xóa.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // Chỉ định cột khóa ngoại trong bảng 'auth_sessions' là 'userId'
  user: User; // Thuộc tính này dùng để truy cập đối tượng User từ AuthSession (không tồn tại trong CSDL)
}
