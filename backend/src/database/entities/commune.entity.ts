import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MultiPolygon, Polygon } from 'geojson';
import { Campagne } from './campagne.entity';
import { Depistage } from './depistage.entity';

/** Référentiel géographique du Bénin (77 communes), géométrie PostGIS. */
@Entity('communes')
export class Commune {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  /** Code INSEE-like ou identifiant de la source ouverte. */
  @Column({ type: 'varchar', length: 10, unique: true, nullable: true })
  code: string | null;

  /** Département de rattachement (12 départements au Bénin). */
  @Column({ type: 'varchar', length: 60, nullable: true })
  departement: string | null;

  @Index('idx_communes_geom', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Geometry',
    srid: 4326,
    nullable: true,
  })
  geometry: Polygon | MultiPolygon | null;

  /** Centroïde pré-calculé : évite un ST_Centroid à chaque rendu de carte. */
  @Column({ type: 'double precision', nullable: true })
  centroid_lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  centroid_lng: number | null;

  @Column({ type: 'integer', nullable: true })
  population: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => Campagne, (campagne) => campagne.commune)
  campagnes: Campagne[];

  @OneToMany(() => Depistage, (depistage) => depistage.commune)
  depistages: Depistage[];
}
