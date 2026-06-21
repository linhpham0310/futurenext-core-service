// src/modules/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  Check,
  OneToMany,
} from 'typeorm';
import { UserCredential } from './user-credential.entity';
import { AuthSession } from '../../auth/entities/auth-session.entity';
import { UserConsent } from './user-consent.entity';
import { TeacherProfile } from './teacher-profile.entity';
import { EmailVerification } from '../../auth/entities/email-verification.entity'; // Import nếu cần relation ngược
import { PasswordResetRequest } from '../../auth/entities/password-reset-request.entity'; // Import nếu cần relation ngược

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}
export enum UserStatus {
  PENDING_EMAIL_VERIFY = 'pending_email_verify',
  ACTIVE = 'active',
  LOCKED = 'locked',
  DELETED = 'deleted',
}

@Entity('users')
@Index('uq_users_email', ['email'], { unique: true })
@Index('idx_users_role_status', ['role', 'status'])
@Check(`"role" IN ('student', 'teacher', 'admin')`)
@Check(`"status" IN ('pending_email_verify', 'active', 'locked', 'deleted')`)
@Check(`length(full_name) > 0 AND length(full_name) <= 100`)
@Check(`email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'`)
@Check(
  `avatar_url IS NULL OR (length(avatar_url) <= 1024 AND avatar_url ~ '^https?://.+')`,
)
@Check(`length(locale) <= 10`)
@Check(`length(timezone) <= 50`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'full_name', nullable: false, length: 100 })
  fullName: string;

  @Column('citext', { unique: true, nullable: false })
  @Index({ unique: true })
  email: string;

  @Column('varchar', { name: 'phone', length: 20, nullable: true })
  phone?: string;

  @Column('varchar', { name: 'avatar_url', nullable: true, length: 1024 })
  avatarUrl?: string | null;

  @Column({
    type: 'text',
    enum: UserRole,
    default: UserRole.STUDENT,
    nullable: false,
  })
  role: UserRole;

  @Column({
    type: 'text',
    enum: UserStatus,
    default: UserStatus.PENDING_EMAIL_VERIFY,
    nullable: false,
  })
  status: UserStatus;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column('varchar', { default: 'vi-VN', length: 10, nullable: false })
  locale: string;

  @Column('varchar', { default: 'Asia/Bangkok', length: 50, nullable: false })
  timezone: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'social_provider', length: 20, nullable: true })
  socialProvider?: string;

  @Column({ name: 'social_id', length: 255, nullable: true })
  socialId?: string;

  @OneToOne(() => UserCredential, (credential) => credential.user, {
    cascade: true,
    eager: false,
  })
  credential?: UserCredential;

  @OneToMany(() => AuthSession, (session) => session.user, { lazy: true })
  sessions?: Promise<AuthSession[]>; // Dùng Promise cho lazy loading

  @OneToMany(() => UserConsent, (consent) => consent.user, { lazy: true })
  consents?: Promise<UserConsent[]>;

  @OneToOne(() => TeacherProfile, (profile) => profile.user, {
    cascade: true,
    eager: false,
  })
  teacherProfile?: TeacherProfile;

  @OneToMany(() => EmailVerification, (verification) => verification.user, {
    lazy: true,
  })
  emailVerifications?: Promise<EmailVerification[]>;

  @OneToMany(() => PasswordResetRequest, (request) => request.user, {
    lazy: true,
  })
  passwordResetRequests?: Promise<PasswordResetRequest[]>;
}
