import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleImage } from './article-image.entity';

export enum ArticleCategorie {
  CAMPAGNES = 'campagnes',
  SENSIBILISATION = 'sensibilisation',
  RESULTATS = 'resultats',
  EVENEMENTS = 'evenements',
}

export enum ArticleStatut {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('articles')
@Index('idx_articles_statut_date', ['statut', 'date_publication'])
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  @Column({ type: 'varchar', length: 220, unique: true })
  slug: string;

  /** Résumé affiché dans les listes et la newsletter. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  extrait: string | null;

  /** HTML produit par l'éditeur WYSIWYG (assaini avant stockage). */
  @Column({ type: 'text' })
  contenu: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', length: 30 })
  categorie: ArticleCategorie;

  @Column({ type: 'varchar', length: 120, nullable: true })
  auteur: string | null;

  @Column({ type: 'varchar', length: 5, default: 'fr' })
  langue: string;

  @Column({ type: 'varchar', length: 20, default: ArticleStatut.DRAFT })
  statut: ArticleStatut;

  /** Date de publication : si future et statut « published », publication différée. */
  @Column({ type: 'timestamp', nullable: true })
  date_publication: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  meta_title: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  meta_description: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => ArticleImage, (image) => image.article)
  images: ArticleImage[];
}
