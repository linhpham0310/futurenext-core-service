// src/modules/users/entities/teacher-profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn, // Thêm UpdateDateColumn để biết hồ sơ được cập nhật khi nào
  ManyToOne, // Thêm ManyToOne cho reviewedBy
  Index,
  Check, // Import Check
} from 'typeorm';
import { User } from './user.entity'; // Import User để tạo quan hệ

// Enum cho trạng thái hồ sơ Teacher
export enum TeacherProfileStatus {
  PENDING = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Đại diện cho bảng 'teacher_profiles'.
 * Lưu trữ thông tin hồ sơ bổ sung dành riêng cho giáo viên,
 * bao gồm trạng thái phê duyệt và thông tin chuyên môn.
 */
@Entity('teacher_profiles') // Ánh xạ tới bảng 'teacher_profiles'
@Check(`"status" IN ('pending_review', 'approved', 'rejected')`) // Ràng buộc CHECK cho status [cite: 1606]
export class TeacherProfile {
  /**
   * Khóa chính duy nhất cho mỗi hồ sơ giáo viên.
   * LLD dùng UUID tự tạo[cite: 1604], nhưng liên kết 1-1 với User nên dùng userId làm PK cũng là một lựa chọn tốt. Ở đây theo LLD.
   */
  @PrimaryGeneratedColumn('uuid') // Khóa chính UUID [cite: 1604]
  id: string;

  /**
   * Khóa ngoại **DUY NHẤT** liên kết đến bảng 'users'.
   * Đảm bảo mỗi user chỉ có tối đa một hồ sơ giáo viên.
   */
  @Column({ type: 'uuid', unique: true }) // Khóa ngoại tới users.id, UNIQUE [cite: 1605]
  userId: string;

  /**
   * Trạng thái phê duyệt hồ sơ giáo viên (pending_review, approved, rejected).
   * Mặc định là 'pending_review'.
   */
  @Column({
    type: 'text',
    enum: TeacherProfileStatus,
    default: TeacherProfileStatus.PENDING, // Giá trị mặc định [cite: 1606]
  })
  @Index('idx_teacher_profiles_status') // Index để lọc hồ sơ theo trạng thái [cite: 1613]
  status: TeacherProfileStatus;

  /**
   * Lý do hồ sơ bị từ chối (nếu status là 'rejected').
   */
  @Column({ type: 'text', nullable: true }) // Cho phép null [cite: 1607]
  rejectionReason: string | null;

  /**
   * Khóa ngoại liên kết đến người dùng (Admin) đã duyệt/từ chối hồ sơ này.
   */
  @Column({ type: 'uuid', nullable: true }) // Cho phép null [cite: 1609]
  reviewedByUserId: string | null;

  /**
   * Thời điểm hồ sơ được duyệt hoặc từ chối.
   */
  @Column({ type: 'timestamptz', nullable: true }) // Cho phép null [cite: 1610]
  reviewedAt: Date | null;

  /**
   * ---- Các trường hồ sơ chuyên môn khác ----
   * Sẽ được bổ sung sau này (ví dụ: kinh nghiệm, chuyên ngành, giới thiệu...)
   * @Column({ type: 'text', nullable: true }) bio: string | null;
   * @Column({ type: 'text', nullable: true }) expertise: string | null;
   * @Column({ type: 'int', nullable: true }) yearsOfExperience: number | null;
   */

  /**
   * Thời điểm hồ sơ giáo viên được tạo (thường là khi user nộp đơn).
   */
  @CreateDateColumn({ type: 'timestamptz' }) // Thời điểm tạo [cite: 1612]
  createdAt: Date;

  /**
   * Thời điểm hồ sơ giáo viên được cập nhật lần cuối.
   */
  @UpdateDateColumn({ type: 'timestamptz' }) // Thêm cột này để theo dõi cập nhật
  updatedAt: Date;

  // --- Định nghĩa Quan hệ ---
  /**
   * Quan hệ Một-Một: Mỗi TeacherProfile thuộc về đúng một User.
   * onDelete: 'CASCADE': Nếu User bị xóa, hồ sơ Teacher cũng bị xóa.
   */
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) // Chỉ định cột khóa ngoại là 'userId' [cite: 1605]
  user: User; // Thuộc tính để truy cập User từ TeacherProfile

  /**
   * Quan hệ Nhiều-Một: Nhiều hồ sơ có thể được duyệt bởi cùng một Admin.
   * nullable: true vì ban đầu chưa có ai duyệt.
   * onDelete: 'SET NULL': Nếu Admin duyệt bị xóa, chỉ set reviewedByUserId thành NULL, không xóa hồ sơ Teacher.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedByUserId' }) // Chỉ định khóa ngoại [cite: 1609]
  reviewedBy: User | null; // Thuộc tính để truy cập Admin đã duyệt
}
