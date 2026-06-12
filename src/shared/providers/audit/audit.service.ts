import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAuditLog } from './audit.entity';

export interface AuditLogPayload {
  actorId?: string;
  action: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, any>;
  targetId?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditLogRepository: Repository<SecurityAuditLog>,
  ) {}

  async log(payload: AuditLogPayload): Promise<void> {
    try {
      const logEntry = this.auditLogRepository.create({
        ...payload,
        meta: payload.meta || payload.details, // merge details vào meta
      });
      await this.auditLogRepository.save(logEntry);
    } catch (error) {
      this.logger.error(
        `Failed to save audit log for action "${payload.action}":`,
        error.stack,
      );
    }
  }
}
