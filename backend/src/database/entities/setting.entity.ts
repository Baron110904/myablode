import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Paramètres système en clé/valeur : seuils cliniques, langues activées,
 * SMTP, template newsletter, politique de sécurité. Un tableau de bord peut
 * les modifier sans migration.
 */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  /** Regroupement pour l'écran Paramètres : kobo, seuils, langues, email… */
  @Column({ type: 'varchar', length: 50 })
  groupe: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

