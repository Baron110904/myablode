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
import { Campagne } from './campagne.entity';
import { Commune } from './commune.entity';
import { User } from './user.entity';

export enum RoleTerrain {
  AGENT = 'agent',
  INFIRMIER = 'infirmier',
  SUPERVISEUR = 'superviseur',
  BENEVOLE = 'benevole',
}

/**
 * Agent de terrain.
 *
 * Distinct d'un `User` : il collecte avec KoboCollect et n'a le plus souvent
 * pas de compte sur la plateforme. Le `code_kobo` est le matricule qu'il
 * saisit dans le formulaire — la seule clé qui permette de lui rattacher ses
 * dépistages.
 */
@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100 })
  prenom: string;

  /** Matricule saisi dans le formulaire Kobo. */
  @Column({ type: 'varchar', length: 40, unique: true, nullable: true })
  code_kobo: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, default: RoleTerrain.AGENT })
  role_terrain: RoleTerrain;

  @Index('idx_agents_actif')
  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => AgentAffectation, (affectation) => affectation.agent)
  affectations: AgentAffectation[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}

/**
 * Affectation d'un agent à une campagne, à une commune, ou aux deux.
 *
 * Les deux champs sont facultatifs : « Kodjo sur toute la campagne de
 * Cotonou » et « Kodjo sur la commune de Bantè, quelle que soit la
 * campagne » sont deux besoins réels du terrain.
 */
@Entity('agent_affectations')
export class AgentAffectation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  agent_id: number;

  @ManyToOne(() => Agent, (agent) => agent.affectations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @Column({ type: 'integer', nullable: true })
  campagne_id: number | null;

  @ManyToOne(() => Campagne, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'campagne_id' })
  campagne: Campagne | null;

  @Column({ type: 'integer', nullable: true })
  commune_id: number | null;

  @ManyToOne(() => Commune, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'commune_id' })
  commune: Commune | null;

  @Column({ type: 'date', nullable: true })
  date_debut: string | null;

  @Column({ type: 'date', nullable: true })
  date_fin: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

/**
 * Encouragement adressé à un agent ou à une équipe communale.
 *
 * Conservé plutôt qu'envoyé et oublié : c'est l'historique de ce qui a été
 * reconnu, et il évite de féliciter deux fois la même performance.
 */
/** Nature d'un message adressé à un agent ou à une équipe. */
export enum TypeMessageAgent {
  ELOGE = 'eloge',
  RAPPEL = 'rappel',
}

@Entity('agent_felicitations')
export class AgentFelicitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  agent_id: number | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  /** Félicitation adressée à une commune entière, sans agent nommé. */
  @Column({ type: 'integer', nullable: true })
  commune_id: number | null;

  @ManyToOne(() => Commune, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'commune_id' })
  commune: Commune | null;

  @Column({ type: 'integer' })
  auteur_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auteur_id' })
  auteur: User;

  @Column({ type: 'varchar', length: 280 })
  message: string;

  /** Éloge ou rappel : les deux sont conservés et datés. */
  @Column({ type: 'varchar', length: 10, default: TypeMessageAgent.ELOGE })
  type: TypeMessageAgent;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
