import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Messages reçus via le formulaire « Contact » du site public. */
@Entity('contacts')
export class ContactMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nom: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  sujet: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  traite: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

/**
 * Décision prise sur une candidature de bénévole.
 *
 * « Traité » ne disait pas ce qui avait été décidé : accepté et refusé
 * portaient la même marque.
 */
export enum StatutCandidature {
  EN_ATTENTE = 'en_attente',
  ACCEPTE = 'accepte',
  REFUSE = 'refuse',
}

/** Candidatures reçues via le formulaire « Devenir bénévole ». */
@Entity('benevoles')
export class Benevole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ville: string | null;

  /** Disponibilité déclarée : semaine, week-end, ponctuelle… */
  @Column({ type: 'varchar', length: 100, nullable: true })
  disponibilite: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 20, default: StatutCandidature.EN_ATTENTE })
  statut: StatutCandidature;

  /** Réponse adressée au candidat, conservée comme trace de l'échange. */
  @Column({ type: 'text', nullable: true })
  reponse: string | null;

  @Column({ type: 'timestamp', nullable: true })
  repondu_le: Date | null;

  /** Fiche agent créée à l'acceptation. */
  @Column({ type: 'integer', nullable: true })
  agent_id: number | null;

  /** Compte de consultation créé à l'acceptation. */
  @Column({ type: 'integer', nullable: true })
  user_id: number | null;

  /*
   * Colonne calculée en base : `statut <> 'en_attente'`. Elle n'est jamais
   * écrite depuis l'application — d'où `insert` et `update` à false, sans
   * lesquels TypeORM tenterait de l'affecter et Postgres la refuserait.
   */
  @Column({ type: 'boolean', insert: false, update: false })
  traite: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
