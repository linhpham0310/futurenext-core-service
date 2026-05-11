// src/modules/users/entities/user-consent.entity.ts
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
import { User } from './user.entity';

@Entity('user_consents')
@Index('idx_user_consents_user_id', ['userId'])
@Check(`length(consent_version) > 0 AND length(consent_version) <= 50`)
@Check(`user_agent IS NULL OR length(user_agent) <= 512`)
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id', nullable: false })
  userId: string;

  @Column('varchar', { name: 'consent_version', length: 50, nullable: false })
  consentVersion: string;

  @Column('timestamptz', { name: 'consent_timestamp', nullable: false })
  consentTimestamp: Date;

  @Column('inet', { name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column('varchar', { name: 'user_agent', length: 512, nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.consents, { onDelete: 'CASCADE' }) // Quan hệ ngược lại
  @JoinColumn({ name: 'user_id' })
  user: User;
}
