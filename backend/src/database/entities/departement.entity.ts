import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MultiPolygon, Polygon } from 'geojson';

/**
 * Les 12 départements du Bénin, niveau supérieur de la carte.
 *
 * La géométrie est la fusion des communes du département, calculée au seed.
 * Aucun fichier de contours ADM1 n'est nécessaire : le découpage communal
 * suffit à reconstituer exactement les départements.
 */
@Entity('departements')
export class Departement {
  @PrimaryGeneratedColumn()
  id: number;

  /** Deux chiffres, reprenant le préfixe des codes communes (« 01 » = Alibori). */
  @Column({ type: 'varchar', length: 4, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  nom: string;

  @Index('idx_departements_geom', { spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Geometry',
    srid: 4326,
    nullable: true,
  })
  geometry: Polygon | MultiPolygon | null;

  @Column({ type: 'double precision', nullable: true })
  centroid_lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  centroid_lng: number | null;

  /** Projection de population 2024 (COD-PS Bénin, OCHA d'après l'INStaD). */
  @Column({ type: 'integer', nullable: true })
  population: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}
