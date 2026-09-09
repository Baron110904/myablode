import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Commune } from './commune.entity';
import { Depistage } from './depistage.entity';

export enum CampagneStatut {
  PLANIFIEE = 'planifiee',
  EN_COURS = 'en_cours',
  CLOTUREE = 'cloturee',
}

@Entity('campagnes')
export class Campagne {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  commune_id: number | null;

  @ManyToOne(() => Commune, (commune) => commune.campagnes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'commune_id' })
  commune: Commune | null;

  @Column({ type: 'varchar', length: 150 })
  nom: string;

  @Column({ type: 'date' })
  date_debut: string;

  @Column({ type: 'date', nullable: true })
  date_fin: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string | null;

  /** Liste libre des participants (une ligne par personne). */
  @Column({ type: 'text', nullable: true })
  equipe: string | null;

  @Column({ type: 'varchar', length: 20, default: CampagneStatut.PLANIFIEE })
  statut: CampagneStatut;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_url: string | null;

  @Column({ type: 'boolean', default: false })
  archivee: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => Depistage, (depistage) => depistage.campagne)
  depistages: Depistage[];
}
