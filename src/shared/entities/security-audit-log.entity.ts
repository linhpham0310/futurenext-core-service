// src/shared/entities/security-audit-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index, // Import Index decorator
  // ManyToOne, // Import nếu cần liên kết actorId với User entity
  // JoinColumn, // Import nếu cần JoinColumn
} from 'typeorm';
// import { User } from '@/modules/users/entities/user.entity'; // Import User nếu muốn tạo quan hệ

/**
 * Đại diện cho bảng 'security_audit_logs' trong cơ sở dữ liệu.
 * Lưu trữ lịch sử các hành động quan trọng liên quan đến bảo mật và quản trị.
 * Dùng cho mục đích kiểm toán, theo dõi và điều tra.
 */
@Entity('security_audit_logs') // Ánh xạ tới bảng 'security_audit_logs'
export class SecurityAuditLog {
  /**
   * Khóa chính duy nhất cho mỗi bản ghi log, tự động tạo UUID.
   */
  @PrimaryGeneratedColumn('uuid') // Khóa chính kiểu UUID
  id: string;

  /**
   * ID của người dùng (hoặc thực thể khác) đã thực hiện hành động.
   * Có thể là null nếu hành động được thực hiện bởi hệ thống.
   * Được đánh index để dễ dàng lọc log theo người thực hiện.
   */
  @Column({ type: 'uuid', nullable: true }) // Kiểu UUID, cho phép null
  @Index() // Tạo index cho cột này
  actorId: string | null;

  /**
   * Chuỗi định danh hành động đã được thực hiện.
   * Nên sử dụng quy ước đặt tên nhất quán (ví dụ: 'auth.login.success', 'admin.user.role.updated').
   * Được đánh index để dễ dàng lọc log theo loại hành động.
   */
  @Column({ type: 'text' }) // Kiểu text, NOT NULL mặc định
  @Index() // Tạo index cho cột này
  action: string;

  /**
   * Địa chỉ IP của client thực hiện hành động (nếu có).
   */
  @Column({ type: 'inet', nullable: true }) // Kiểu dữ liệu inet cho địa chỉ IP, cho phép null
  ip: string | null;

  /**
   * Chuỗi User Agent của client thực hiện hành động (nếu có).
   */
  @Column({ type: 'text', nullable: true }) // Kiểu text, cho phép null
  userAgent: string | null;

  /**
   * Lưu trữ dữ liệu ngữ cảnh bổ sung dưới dạng JSON.
   * Rất linh hoạt để lưu các thông tin khác nhau tùy thuộc vào hành động,
   * ví dụ: ID của đối tượng bị tác động (targetId), dữ liệu thay đổi (diff), thông báo lỗi (error)...
   */
  @Column({ type: 'jsonb', nullable: true }) // Kiểu jsonb của PostgreSQL, cho phép null
  meta: Record<string, any> | null; // Định nghĩa kiểu là một object bất kỳ

  /**
   * Thời điểm bản ghi log này được tạo. Tự động quản lý bởi TypeORM.
   */
  @CreateDateColumn({ type: 'timestamptz' }) // Tự động set khi insert, kiểu timestamp with time zone
  createdAt: Date;

  // --- (Tùy chọn) Định nghĩa Quan hệ với User (Actor) ---
  // Nếu bạn muốn dễ dàng truy cập thông tin chi tiết của actor từ log:
  // @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) // Nếu User bị xóa, set actorId = NULL
  // @JoinColumn({ name: 'actorId' }) // Chỉ định khóa ngoại
  // actor: User | null;
}
