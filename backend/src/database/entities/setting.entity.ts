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

/** Clés connues, centralisées pour éviter les chaînes magiques. */
export const SettingKeys = {
  SEUIL_GLYCEMIE_NORMALE: 'seuil_glycemie_normale',
  SEUIL_GLYCEMIE_DIABETE: 'seuil_glycemie_diabete',
  SEUIL_IMC_SURPOIDS: 'seuil_imc_surpoids',
  SEUIL_IMC_OBESITE: 'seuil_imc_obesite',
  SEUIL_ALERTE_PREVALENCE: 'seuil_alerte_prevalence',
  LANGUES_ACTIVES: 'langues_actives',
  LANGUE_DEFAUT: 'langue_defaut',
  NEWSLETTER_TEMPLATE: 'newsletter_template',
  NEWSLETTER_SIGNATURE: 'newsletter_signature',
  SECURITE_2FA: 'securite_2fa',
  SECURITE_DUREE_SESSION: 'securite_duree_session',
} as const;
