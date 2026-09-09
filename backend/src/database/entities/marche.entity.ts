import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';

/**
 * Formulaire d'inscription à la marche « Sucre à terre ».
 *
 * Rattaché à l'article de l'édition : c'est lui qui le porte sur le site
 * public, et sa dépublication emporte celle du formulaire.
 */
@Entity('formulaires_marche')
export class FormulaireMarche {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  article_id: number;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  /** Texte affiché au-dessus des champs. */
  @Column({ type: 'text', nullable: true })
  introduction: string | null;

  /** Sans date, le formulaire reste ouvert jusqu'à sa dépublication. */
  @Column({ type: 'timestamp', nullable: true })
  date_fermeture: Date | null;

  /** Ce qui s'affiche une fois la date passée. */
  @Column({ type: 'varchar', length: 400, nullable: true })
  message_ferme: string | null;

  @Column({ type: 'boolean', default: false })
  publie: boolean;

  @OneToMany(() => InscriptionMarche, (inscription) => inscription.formulaire)
  inscriptions: InscriptionMarche[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

/**
 * Inscription reçue depuis le site public.
 *
 * Les champs sont ceux du bulletin papier de la marche, repris tels quels :
 * l'objectif est de préparer les dossards et les groupes de départ, pas de
 * constituer un fichier.
 */
@Entity('inscriptions_marche')
export class InscriptionMarche {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  formulaire_id: number;

  @ManyToOne(() => FormulaireMarche, (formulaire) => formulaire.inscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'formulaire_id' })
  formulaire: FormulaireMarche;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  @Column({ type: 'integer' })
  age: number;

  @Column({ type: 'varchar', length: 1 })
  sexe: 'M' | 'F';

  /** Profession ou rôle déclaré : élève, infirmier, commerçante… */
  @Column({ type: 'varchar', length: 120 })
  fonction: string;

  @Column({ type: 'varchar', length: 100 })
  ville: string;

  @Column({ type: 'varchar', length: 120 })
  quartier: string;

  /**
   * Nullable en base malgré l'obligation au formulaire : les inscriptions
   * antérieures à l'ajout de ce champ n'en ont pas.
   */
  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ type: 'boolean', default: false })
  deja_participe: boolean;

  @Column({ type: 'text', nullable: true })
  motivation: string | null;

  @Index('idx_inscriptions_traite')
  @Column({ type: 'boolean', default: false })
  traite: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
