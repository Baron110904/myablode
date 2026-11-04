import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Rubriques de la section « Nos actions en vidéo ». Elles doublent celles des
 * articles sans s'y confondre : une vidéo de prévention n'est pas un article
 * de sensibilisation, et les deux listes se filtrent séparément.
 */
export enum VideoCategorie {
  DEPISTAGE = 'depistage',
  EVENEMENT = 'evenement',
  PREVENTION = 'prevention',
  CAMPAGNE = 'campagne',
}

export enum VideoStatut {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('videos')
@Index('idx_videos_statut_date', ['statut', 'date_publication'])
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 30 })
  categorie: VideoCategorie;

  /**
   * Adresse publique servie par l'API : `/uploads/videos/<nom>`.
   *
   * Elle est construite par le serveur à partir du nom tiré au sort, jamais
   * reprise du client : une adresse fournie par le navigateur reviendrait à
   * laisser choisir le chemin de lecture.
   */
  @Column({ type: 'varchar', length: 255 })
  fichier_url: string;

  /** Nom du fichier sur le disque. Sert à le supprimer avec la fiche. */
  @Column({ type: 'varchar', length: 255 })
  fichier_nom: string;

  /** Taille en octets, telle que relevée à la réception. */
  @Column({ type: 'bigint', nullable: true })
  taille: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime: string | null;

  /**
   * Image d'attente. Facultative : sans elle, le lecteur affiche la première
   * image de la vidéo, ce qui suffit dans la plupart des cas.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  miniature_url: string | null;

  /**
   * Durée en secondes, mesurée par le navigateur au moment du dépôt.
   *
   * Le serveur ne sait pas la lire : il faudrait ffprobe. Le navigateur, lui,
   * l'obtient en chargeant les métadonnées du fichier choisi, avant même
   * l'envoi — c'est gratuit et exact.
   */
  @Column({ type: 'integer', nullable: true })
  duree_secondes: number | null;

  @Column({ type: 'varchar', length: 20, default: VideoStatut.DRAFT })
  statut: VideoStatut;

  /** Mise en avant : la vidéo occupe le grand lecteur de la page Actualités. */
  @Column({ type: 'boolean', default: false })
  a_la_une: boolean;

  @Column({ type: 'timestamp', nullable: true })
  date_publication: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}
