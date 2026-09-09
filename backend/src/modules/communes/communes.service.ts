import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { FeatureCollection } from 'geojson';
import { DataSource, Repository } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { Commune } from 'src/database/entities';

@Injectable()
export class CommunesService {
  constructor(
    @InjectRepository(Commune)
    private readonly repository: Repository<Commune>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  /** Liste légère (sans géométrie) pour les listes déroulantes et filtres. */
  async findAll(): Promise<
    Array<Pick<Commune, 'id' | 'nom' | 'code' | 'departement'>>
  > {
    return this.cache.remember('communes:liste', 3600, async () =>
      this.repository.find({
        select: ['id', 'nom', 'code', 'departement'],
        order: { nom: 'ASC' },
      }),
    );
  }

  async findOne(id: number): Promise<Commune> {
    const commune = await this.repository.findOne({ where: { id } });
    if (!commune) {
      throw new NotFoundException(`Commune ${id} introuvable.`);
    }
    return commune;
  }

  /** Recherche par nom, insensible à la casse et aux accents (imports). */
  async trouverParNom(nom: string): Promise<Commune | null> {
    if (!nom?.trim()) return null;
    const [commune] = await this.dataSource.query(
      `SELECT * FROM communes
       WHERE unaccent_lower(nom) = unaccent_lower($1)
       LIMIT 1`,
      [nom.trim()],
    );
    return commune ?? null;
  }

  /** Géométries seules, mises en cache : elles ne changent qu'à l'upload. */
  async geometries(): Promise<unknown> {
    return this.cache.remember('communes:geojson', 86400, async () => {
      const [{ geojson }] = await this.dataSource.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geometry, 0.002))::json,
              'properties', json_build_object('id', id, 'nom', nom, 'code', code, 'departement', departement)
            )
          ), '[]'::json)
        ) AS geojson
        FROM communes WHERE geometry IS NOT NULL
      `);
      return geojson;
    });
  }

  /**
   * Remplace les géométries à partir d'un GeoJSON téléversé (US-ADM-16).
   * Les communes sont appariées par nom : les dépistages déjà rattachés ne
   * sont jamais dissociés, seule la forme est mise à jour.
   */
  async remplacerGeometries(
    collection: FeatureCollection,
  ): Promise<{ misesAJour: number; ignorees: string[] }> {
    if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      throw new BadRequestException(
        'Fichier invalide : un GeoJSON de type FeatureCollection est attendu.',
      );
    }

    const ignorees: string[] = [];
    let misesAJour = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const feature of collection.features) {
        const props = (feature.properties ?? {}) as Record<string, string>;
        const nom = props.nom ?? props.shapeName ?? props.name ?? props.NAME_2;
        if (!nom || !feature.geometry) {
          ignorees.push(nom ?? '(sans nom)');
          continue;
        }

        const resultat = await manager.query(
          `UPDATE communes
           SET geometry = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)),
               centroid_lat = ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))),
               centroid_lng = ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))),
               updated_at = now()
           WHERE unaccent_lower(nom) = unaccent_lower($1)
           RETURNING id`,
          [nom, JSON.stringify(feature.geometry)],
        );

        if (resultat[1] > 0 || resultat[0]?.length > 0) {
          misesAJour += 1;
        } else {
          ignorees.push(nom);
        }
      }
    });

    await this.cache.invalidate('communes:');
    await this.cache.invalidate('stats:');
    return { misesAJour, ignorees };
  }

  async countCommunes(): Promise<number> {
    return this.repository.count();
  }
}
