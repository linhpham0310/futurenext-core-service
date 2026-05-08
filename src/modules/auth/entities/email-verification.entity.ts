// src/modules/auth/entities/email-verification.entity.ts
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
import { User } from '@/modules/users/entities/user.entity';

@Entity('email_verifications')
@Index('idx_email_verifications_user_id', ['userId'])
@Index('idx_email_verifications_email', ['email'])
@Index('idx_email_verifications_lookup', ['email', 'consumedAt', 'expiresAt'])
@Check(`attempt_count >= 0`) // Đảm bảo số lần thử không âm
export class EmailVerification {
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

  @Column('int', { name: 'attempt_count', default: 0, nullable: false })
  attemptCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.emailVerifications, {
    onDelete: 'CASCADE',
  }) // Quan hệ ngược lại
  @JoinColumn({ name: 'user_id' })
  user: User;
}
