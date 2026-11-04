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

  /**
   * Article mis en avant sur la page « Actualités ».
   *
   * Plusieurs articles peuvent l'être : les listes publiques les remontent
   * en tête, et le plus récent d'entre eux occupe le grand encart. Sans
   * aucun article coché, c'est la dernière parution qui le prend — mieux
   * vaut un encart rempli par défaut qu'une page qui s'effondre parce que
   * personne n'a pensé à cocher la case.
   */
  @Column({ type: 'boolean', default: false })
  a_la_une: boolean;

  /**
   * Échéance facultative : passée cette date, l'article disparaît du site
   * mais reste au back-office. L'annonce d'un événement se retire ainsi
   * toute seule, sans dépublication manuelle ni perte de l'archive.
   */
  @Column({ type: 'timestamp', nullable: true })
  date_retrait: Date | null;

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
