// src/modules/auth/entities/auth-session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { User, UserRole } from '@/modules/users/entities/user.entity';

@Entity('auth_sessions')
@Index('idx_auth_sessions_user_id', ['userId'])
@Index('idx_auth_sessions_expires_at', ['expiresAt'])
@Check(`"role_at_login" IN ('student', 'teacher', 'admin')`)
@Check(`user_agent IS NULL OR length(user_agent) <= 512`)
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id', nullable: false })
  userId: string;

  @Column('text', { name: 'refresh_token_hash', unique: true, nullable: false })
  @Index({ unique: true }) // Index unique tường minh
  refreshTokenHash: string;

  @Column({
    name: 'role_at_login',
    type: 'text',
    enum: UserRole,
    nullable: false,
  })
  roleAtLogin: UserRole;

  @Column('inet', { name: 'ip', nullable: true })
  ip?: string;

  @Column('varchar', { name: 'user_agent', length: 512, nullable: true })
  userAgent?: string;

  @Column('timestamptz', { name: 'expires_at', nullable: false })
  expiresAt: Date;

  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' }) // Quan hệ ngược lại
  @JoinColumn({ name: 'user_id' })
  user: User;
}
