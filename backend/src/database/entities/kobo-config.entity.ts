import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum SyncStatus {
  JAMAIS = 'jamais',
  SUCCES = 'succes',
  ERREUR = 'erreur',
  EN_COURS = 'en_cours',
}

/**
 * Paramètres de connexion KoboToolbox. Une seule ligne (id = 1) : la
 * plateforme ne consomme qu'un formulaire de collecte à la fois.
 */
@Entity('kobo_config')
export class KoboConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, default: 'https://kf.kobotoolbox.org' })
  api_url: string;

  /** Jeton API Kobo — jamais renvoyé au client (masqué par le service). */
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  api_token: string | null;

  /** UID de l'asset Kobo, ex. aXbYcZ… */
  @Column({ type: 'varchar', length: 100, nullable: true })
  form_id: string | null;

  /** Intervalle de synchronisation automatique, en minutes (0 = désactivée). */
  @Column({ type: 'integer', default: 30 })
  sync_interval: number;

  @Column({ type: 'boolean', default: false })
  auto_sync_enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: SyncStatus.JAMAIS })
  last_sync_status: SyncStatus;

  @Column({ type: 'text', nullable: true })
  last_sync_message: string | null;

  @Column({ type: 'integer', default: 0 })
  last_sync_count: number;

  /**
   * Correspondance champ Kobo → colonne `depistages`.
   * Ex. { "nom_complet": "nom", "glyc_mgdl": "glycemie" }
   */
  @Column({ type: 'jsonb', nullable: true })
  field_mapping: Record<string, string> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

export enum SyncLogStatut {
  SUCCES = 'succes',
  ERREUR = 'erreur',
}

/** Journal détaillé de chaque synchronisation (manuelle ou automatique). */
@Entity('kobo_sync_logs')
export class KoboSyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  statut: SyncLogStatut;

  @Column({ type: 'varchar', length: 20 })
  declencheur: 'manuel' | 'cron';

  @Column({ type: 'integer', default: 0 })
  nb_recus: number;

  @Column({ type: 'integer', default: 0 })
  nb_importes: number;

  @Column({ type: 'integer', default: 0 })
  nb_doublons: number;

  @Column({ type: 'integer', default: 0 })
  nb_erreurs: number;

  @Column({ type: 'integer', nullable: true })
  duree_ms: number | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
