// src/modules/users/entities/teacher-profile.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
  ManyToOne,
  Check,
} from 'typeorm';
import { User } from './user.entity';

export enum TeacherProfileStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('teacher_profiles')
@Index('idx_teacher_profiles_status', ['status'])
@Check(`status IN ('pending_review', 'approved', 'rejected')`)
@Check(`bio IS NULL OR length(bio) <= 2000`)
@Check(`experience_years IS NULL OR experience_years >= 0`)
@Check(
  `linkedin_url IS NULL OR (length(linkedin_url) <= 1024 AND linkedin_url ~ '^https?://.+')`,
)
@Check(`rejection_reason IS NULL OR length(rejection_reason) <= 1000`)
export class TeacherProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id', unique: true, nullable: false }) // user_id là unique
  userId: string;

  @Column({
    type: 'text',
    enum: TeacherProfileStatus,
    default: TeacherProfileStatus.PENDING_REVIEW,
    nullable: false,
  })
  status: TeacherProfileStatus;

  @Column('varchar', { length: 2000, nullable: true })
  bio?: string;

  @Column('text', { array: true, nullable: true }) // Kiểu mảng text
  expertise?: string[];

  @Column('int', { name: 'experience_years', nullable: true })
  experienceYears?: number;

  @Column('varchar', { name: 'linkedin_url', length: 1024, nullable: true })
  linkedinUrl?: string;

  @Column('varchar', { name: 'rejection_reason', length: 1000, nullable: true })
  rejectionReason?: string;

  @Column('uuid', { name: 'reviewed_by_user_id', nullable: true })
  @Index('idx_teacher_profiles_reviewed_by')
  reviewedByUserId?: string;

  @Column('timestamptz', { name: 'reviewed_at', nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.teacherProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy?: User;
}
