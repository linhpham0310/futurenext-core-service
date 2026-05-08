// src/shared/providers/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // Import decorator để inject repository
import { Repository } from 'typeorm'; // Import Repository type
import { SecurityAuditLog } from '../entities/security-audit-log.entity'; // Import entity đã tạo

/**
 * Interface định nghĩa cấu trúc cơ bản cho dữ liệu meta của log audit.
 */
interface AuditLogMeta {
  actorId?: string | null; // ID của người dùng thực hiện hành động (nếu có)
  ip?: string | null; // Địa chỉ IP nguồn (nếu có)
  userAgent?: string | null; // User Agent của client (nếu có)
  targetId?: string | null; // ID của đối tượng bị tác động (vd: user ID bị đổi role)
  diff?: Record<string, any> | null; // Ghi lại sự thay đổi (vd: { oldRole: 'student', newRole: 'teacher' })
  error?: string | null; // Ghi lại thông báo lỗi nếu hành động thất bại
  [key: string]: any; // Cho phép thêm các trường meta khác nếu cần
}

/**
 * Service dùng chung để ghi lại các log kiểm toán (audit logs) vào CSDL.
 * Các service nghiệp vụ khác (AuthService, UsersService...) sẽ inject và gọi hàm log() này.
 * Được đánh dấu là Global trong SharedModule.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    // ✅ Inject Repository của SecurityAuditLog entity
    @InjectRepository(SecurityAuditLog)
    private readonly auditLogRepository: Repository<SecurityAuditLog>,
  ) {}

  /**
   * Ghi một bản ghi log audit mới vào bảng security_audit_logs.
   * Hàm này nên được thiết kế để không ném lỗi ra ngoài (fail-safe)
   * để không làm gián đoạn luồng nghiệp vụ chính nếu việc ghi log thất bại.
   * @param action Một chuỗi định danh hành động (ví dụ: 'user.login.success', 'user.role.updated').
   * @param meta Một object chứa các thông tin ngữ cảnh liên quan đến hành động.
   */
  async log(action: string, meta: AuditLogMeta): Promise<void> {
    try {
      // --- Logic ghi log vào Database ---
      const newLog = this.auditLogRepository.create({
        action: action, // Tên hành động
        actorId: meta.actorId || null, // ID người thực hiện
        ip: meta.ip || null, // IP nguồn
        userAgent: meta.userAgent || null, // User Agent
        // Lưu toàn bộ đối tượng meta vào cột kiểu jsonb để linh hoạt
        // Loại bỏ các trường đã có cột riêng để tránh trùng lặp nếu muốn
        meta: {
          targetId: meta.targetId,
          diff: meta.diff,
          error: meta.error,
          ...meta, // Bao gồm cả các trường meta khác
        },
      });

      // Lưu bản ghi vào CSDL (không cần await nếu muốn chạy bất đồng bộ "fire-and-forget")
      // Tuy nhiên, await giúp đảm bảo log được ghi trước khi response (tùy yêu cầu)
      await this.auditLogRepository.save(newLog);

      // Log ra console ở môi trường dev để dễ theo dõi
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `[AUDIT] Action: ${action}, Meta: ${JSON.stringify(meta)}`,
        );
      }
    } catch (error) {
      // ✅ Quan trọng: Bắt lỗi và chỉ log lỗi ra console, không ném lỗi ra ngoài.
      this.logger.error(
        `Failed to write audit log for action "${action}": ${error.message}`,
        error.stack,
      );
    }
  }
}
