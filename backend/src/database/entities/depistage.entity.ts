import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Point } from 'geojson';
import { Campagne } from './campagne.entity';
import { Commune } from './commune.entity';
import { User } from './user.entity';

export enum DepistageType {
  DIABETE = 'diabete',
  OBESITE = 'obesite',
  ENDOCRINOPATHIE = 'endocrinopathie',
}

export enum DepistageResultat {
  NORMAL = 'normal',
  PRE_DIABETE = 'pre-diabete',
  DIABETE = 'diabete',
  OBESITE = 'obesite',
  AUTRE = 'autre',
  /**
   * Mesure hors des bornes physiologiques : aucun résultat clinique ne peut
   * en être tiré. Ni cas détecté, ni dépistage normal — une ligne à reprendre.
   */
  A_VERIFIER = 'a_verifier',
}

export enum DepistageSource {
  KOBO = 'kobo',
  FILE = 'file',
  MANUAL = 'manual',
}

export enum Sexe {
  M = 'M',
  F = 'F',
}

/** Table centrale : un enregistrement = une personne dépistée sur le terrain. */
@Entity('depistages')
@Index('idx_depistages_commune_date', ['commune_id', 'date_depistage'])
@Index('idx_depistages_resultat_date', ['resultat', 'date_depistage'])
export class Depistage {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_depistages_commune')
  @Column({ type: 'integer', nullable: true })
  commune_id: number | null;

  @ManyToOne(() => Commune, (commune) => commune.depistages, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'commune_id' })
  commune: Commune | null;

  @Index('idx_depistages_campagne')
  @Column({ type: 'integer', nullable: true })
  campagne_id: number | null;

  @ManyToOne(() => Campagne, (campagne) => campagne.depistages, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'campagne_id' })
  campagne: Campagne | null;

  /** Auteur de la saisie (null pour les imports Kobo automatiques). */
  @Column({ type: 'integer', nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code_unique: string | null;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  @Column({ type: 'date' })
  date_naissance: string;

  @Column({ type: 'varchar', length: 1 })
  sexe: Sexe;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string | null;

  @Index('idx_depistages_date')
  @Column({ type: 'date' })
  date_depistage: string;

  @Column({ type: 'varchar', length: 20 })
  type: DepistageType;

  /** Glycémie en mg/dL. Précision large : aucune saisie n'est refusée. */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  glycemie: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  imc: string | null;

  /** Poids en kilogrammes, tel que relevé sur le terrain. */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  poids: string | null;

  /** Taille en centimètres, telle que relevée sur le terrain. */
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  taille: string | null;

  /** Agent de terrain qui a collecté ce dépistage, quand il est identifié. */
  @Column({ type: 'integer', nullable: true })
  agent_id: number | null;

  /**
   * Mesure sortant du domaine physiologique. La ligne est enregistrée quand
   * même : le drapeau sert à la reprendre, pas à la refuser.
   */
  @Column({ type: 'boolean', default: false })
  hors_norme: boolean;

  @Column({ type: 'varchar', length: 160, nullable: true })
  motif_hors_norme: string | null;

  @Index('idx_depistages_resultat')
  @Column({ type: 'varchar', length: 30 })
  resultat: DepistageResultat;

  @Column({ type: 'boolean', default: false })
  oriente_centre: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 20, default: DepistageSource.MANUAL })
  source: DepistageSource;

  /** Identifiant de la soumission Kobo — sert au dédoublonnage des imports. */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  kobo_id: string | null;

  /**
   * Position GPS de la soumission quand Kobo la fournit. Permet la couche
   * « points individuels » et la heatmap de la carte admin.
   */
  @Index('idx_depistages_geom', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  localisation: Point | null;

  @Column({ type: 'boolean', default: false })
  verifie: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;
}
