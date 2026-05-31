// src/modules/users/entities/user-credential.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_credentials')
@Check(`"password_algo" = 'bcrypt'`)
export class UserCredential {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column('text', { name: 'password_hash', nullable: false })
  passwordHash: string;

  @Column('text', { name: 'password_algo', default: 'bcrypt', nullable: false })
  passwordAlgo: string;

  @Column('timestamptz', {
    name: 'password_updated_at',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  passwordUpdatedAt: Date;

  @Column('boolean', {
    name: 'must_change_password',
    default: false,
    nullable: false,
  })
  mustChangePassword: boolean;

  @OneToOne(() => User, (user) => user.credential, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
