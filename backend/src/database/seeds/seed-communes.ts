import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import type { Feature, FeatureCollection } from 'geojson';
import { COMMUNES_REFERENCE, communeCode } from './communes.reference';

/**
 * Charge les 77 communes du Bénin dans PostGIS depuis le GeoJSON ouvert
 * (geoBoundaries ADM2). Idempotent : réexécuter met à jour les géométries.
 */
export async function seedCommunes(dataSource: DataSource): Promise<number> {
  const geojsonPath = resolveGeojsonPath();
  const collection = JSON.parse(
    readFileSync(geojsonPath, 'utf8'),
  ) as FeatureCollection;

  const parShapeName = new Map<string, Feature>();
  for (const feature of collection.features) {
    const shapeName = (feature.properties as Record<string, string> | null)?.shapeName;
    if (shapeName) parShapeName.set(shapeName, feature);
  }

  const rangParDepartement = new Map<string, number>();
  let inserted = 0;
  const manquantes: string[] = [];

  for (const ref of COMMUNES_REFERENCE) {
    const feature = parShapeName.get(ref.cle);
    if (!feature) {
      manquantes.push(ref.cle);
      continue;
    }

    const rang = rangParDepartement.get(ref.departement) ?? 0;
    rangParDepartement.set(ref.departement, rang + 1);
    const code = communeCode(ref, rang);
    const geometry = JSON.stringify(feature.geometry);

    await dataSource.query(
      `
      INSERT INTO communes (nom, code, departement, geometry, centroid_lat, centroid_lng, updated_at)
      VALUES (
        $1, $2, $3,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)),
        ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))),
        ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))),
        now()
      )
      ON CONFLICT (code) DO UPDATE SET
        nom = EXCLUDED.nom,
        departement = EXCLUDED.departement,
        geometry = EXCLUDED.geometry,
        centroid_lat = EXCLUDED.centroid_lat,
        centroid_lng = EXCLUDED.centroid_lng,
        updated_at = now()
      `,
      [ref.nom, code, ref.departement, geometry],
    );
    inserted += 1;
  }

  if (manquantes.length > 0) {
    throw new Error(
      `Communes absentes du GeoJSON : ${manquantes.join(', ')}. ` +
        `Vérifiez data/benin-communes.geojson.`,
    );
  }

  return inserted;
}

/** Le dossier `data` est à la racine du backend en dev, à côté de dist en prod. */
function resolveGeojsonPath(): string {
  const candidates = [
    join(process.cwd(), 'data', 'benin-communes.geojson'),
    join(__dirname, '..', '..', '..', 'data', 'benin-communes.geojson'),
    join(__dirname, '..', '..', '..', '..', 'data', 'benin-communes.geojson'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // on essaie le chemin suivant
    }
  }
  throw new Error(
    'Fichier data/benin-communes.geojson introuvable. ' +
      'Téléchargez le GeoJSON ADM2 du Bénin (voir README).',
  );
}
