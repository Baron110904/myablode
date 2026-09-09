import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AuditLog } from './audit-log.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.VIEWER })
  role: UserRole;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  twofa_secret: string | null;

  @Column({ type: 'boolean', default: false })
  twofa_enabled: boolean;

  /**
   * Hash du refresh token courant. Le stocker permet de révoquer une session
   * (déconnexion, désactivation d'un compte) sans attendre l'expiration du JWT.
   */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  refresh_token_hash: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  reset_token_hash: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  reset_token_expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login: Date | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => AuditLog, (log) => log.user)
  audit_logs: AuditLog[];
}
