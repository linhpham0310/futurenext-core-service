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
import { User } from '@/modules/users/entities/user.entity';

@Entity('password_reset_requests')
@Index('idx_password_reset_user_id', ['userId'])
@Index('idx_password_reset_lookup', ['email', 'consumedAt', 'expiresAt'])
export class PasswordResetRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id', nullable: false })
  userId: string;

  @Column('citext', { nullable: false })
  email: string;

  @Column('text', { name: 'code_hash', nullable: false })
  codeHash: string;

  @Column('timestamptz', { name: 'expires_at', nullable: false })
  expiresAt: Date;

  @Column('timestamptz', { name: 'consumed_at', nullable: true })
  consumedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.passwordResetRequests, {
    onDelete: 'CASCADE',
  }) // Quan hệ ngược lại
  @JoinColumn({ name: 'user_id' })
  user: User;
}
