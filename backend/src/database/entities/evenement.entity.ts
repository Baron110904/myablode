import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Date forte d'une édition : conférence de presse, grande marche, projection.
 *
 * Distincte de `campagnes`, qui décrit une opération de dépistage rattachée à
 * une commune et porte des relevés. Un événement n'a pas de dépistages : il
 * sert l'affichage public, le bandeau chronologique de l'accueil et l'encart
 * « Les grandes dates ». Les deux listes ne se recoupent pas.
 */
@Entity('evenements')
@Index('idx_evenements_publie_date', ['publie', 'date_debut'])
export class Evenement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  /** Précision affichée sous le titre : lieu, nature, mention d'édition. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  sous_titre: string | null;

  @Column({ type: 'date' })
  date_debut: string;

  /** Renseignée pour une opération qui court sur plusieurs jours. */
  @Column({ type: 'date', nullable: true })
  date_fin: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lieu: string | null;

  /** Phrase reprise telle quelle dans l'encart « Les grandes dates ». */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Libellé de rattachement, par exemple « 6ᵉ édition ». */
  @Column({ type: 'varchar', length: 60, nullable: true })
  edition: string | null;

  @Column({ type: 'boolean', default: true })
  publie: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}
