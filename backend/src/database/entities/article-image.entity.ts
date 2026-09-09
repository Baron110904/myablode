import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity('images')
export class ArticleImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  article_id: number | null;

  @ManyToOne(() => Article, (article) => article.images, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'article_id' })
  article: Article | null;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  /** Taille en octets. */
  @Column({ type: 'integer', nullable: true })
  taille: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
