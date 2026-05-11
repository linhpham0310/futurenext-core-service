// src/shared/providers/audit/audit.entity.ts
import { User } from '@/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';

@Entity('security_audit_logs')
@Index('idx_security_audit_logs_created_at', ['createdAt']) // Index DESC để lấy log mới nhất nhanh hơn
@Check(`length(action) > 0 AND length(action) <= 100`)
@Check(`user_agent IS NULL OR length(user_agent) <= 512`)
export class SecurityAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'actor_id', nullable: true })
  @Index('idx_security_audit_logs_actor_id')
  actorId?: string;

  // onDelete: 'SET NULL' giữ lại log dù actor bị xóa
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false }) // eager: false để không tự load user
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column('varchar', { length: 100, nullable: false })
  @Index('idx_security_audit_logs_action')
  action: string;

  @Column('inet', { nullable: true })
  ip?: string;

  @Column('varchar', { name: 'user_agent', length: 512, nullable: true })
  userAgent?: string;

  // jsonb cho phép index và query hiệu quả
  @Column('jsonb', { nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
