import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Journal immuable des actions admin. Aucune route d'écriture ou de
 * suppression n'est exposée : seul le service interne y insère des lignes.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_user_date', ['user_id', 'created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, (user) => user.audit_logs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /** Verbe métier : login, create, update, delete, import, sync, export… */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /** Table ou domaine concerné : depistage, campagne, article, user… */
  @Column({ type: 'varchar', length: 50 })
  entity: string;

  @Column({ type: 'integer', nullable: true })
  entity_id: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
