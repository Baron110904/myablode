import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity('newsletter')
export class NewsletterAbonne {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  /** Jeton de désinscription en un clic, inclus dans chaque envoi. */
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

export enum EnvoiStatut {
  ENVOYE = 'envoye',
  ECHEC = 'echec',
  PLANIFIE = 'planifie',
}

@Entity('newsletter_envois')
export class NewsletterEnvoi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  article_id: number | null;

  @ManyToOne(() => Article, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'article_id' })
  article: Article | null;

  @Column({ type: 'varchar', length: 200 })
  sujet: string;

  @Column({ type: 'text' })
  contenu: string;

  @Column({ type: 'varchar', length: 20, default: EnvoiStatut.PLANIFIE })
  statut: EnvoiStatut;

  @Column({ type: 'integer', default: 0 })
  nb_destinataires: number;

  @Column({ type: 'integer', default: 0 })
  nb_ouvertures: number;

  @Column({ type: 'integer', default: 0 })
  nb_clics: number;

  @Column({ type: 'timestamp', nullable: true })
  date_envoi: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
