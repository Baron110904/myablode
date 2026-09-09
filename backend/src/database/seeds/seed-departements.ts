import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { COMMUNES_REFERENCE, DEPARTEMENTS } from './communes.reference';

/**
 * Populations communales et départementales, puis contours départementaux.
 *
 * Les effectifs viennent des projections 2024 diffusées par OCHA d'après
 * l'INStaD (jeu « COD-PS Bénin », licence CC BY-IGO), déposées dans `data/`
 * pour que le seed reste reproductible hors ligne. La jointure se fait sur
 * `ADM2_FR`, qui reprend la même graphie que la clé `cle` du référentiel —
 * à la casse près : le fichier écrit « N'Dali » là où le référentiel suit
 * geoBoundaries avec « N'dali ». Les libellés sont donc réduits des deux
 * côtés avant comparaison.
 *
 * Les contours départementaux ne sont pas téléchargés : ils sont obtenus en
 * fusionnant les communes de chaque département.
 */
export async function seedDepartements(dataSource: DataSource): Promise<{
  communesRenseignees: number;
  departements: number;
}> {
  const popCommunes = lireCsv('benin-population-adm2-2024.csv', 'ADM2_FR');
  const popDepartements = lireCsv('benin-population-adm1-2024.csv', 'ADM1_FR');

  // ─── 1. Population de chaque commune ───────────────────────────────────
  let communesRenseignees = 0;
  const sansPopulation: string[] = [];

  for (const ref of COMMUNES_REFERENCE) {
    const population = popCommunes.get(reduire(ref.cle));
    if (population === undefined) {
      sansPopulation.push(ref.cle);
      continue;
    }
    const { affectees } = await majPopulationCommune(dataSource, ref.nom, population);
    communesRenseignees += affectees;
  }

  if (sansPopulation.length > 0) {
    throw new Error(
      `Communes absentes du fichier de population : ${sansPopulation.join(', ')}. ` +
        `Vérifiez data/benin-population-adm2-2024.csv.`,
    );
  }

  // ─── 2. Départements : fusion des contours communaux ───────────────────
  for (const [index, nom] of DEPARTEMENTS.entries()) {
    const code = String(index + 1).padStart(2, '0');

    /*
     * ST_Union recolle les communes voisines ; ST_Buffer(0) referme les micro
     * interstices que laissent des contours simplifiés indépendamment les uns
     * des autres, sinon la frontière départementale apparaît trouée.
     */
    await dataSource.query(
      `
      INSERT INTO departements (code, nom, geometry, centroid_lat, centroid_lng, population, updated_at)
      SELECT
        $1::varchar, $2::varchar,
        ST_Multi(ST_Buffer(ST_Union(c.geometry), 0)),
        ST_Y(ST_Centroid(ST_Union(c.geometry))),
        ST_X(ST_Centroid(ST_Union(c.geometry))),
        $3::integer,
        now()
      FROM communes c
      WHERE c.departement = $2::varchar
      HAVING COUNT(*) > 0
      ON CONFLICT (code) DO UPDATE SET
        nom = EXCLUDED.nom,
        geometry = EXCLUDED.geometry,
        centroid_lat = EXCLUDED.centroid_lat,
        centroid_lng = EXCLUDED.centroid_lng,
        population = EXCLUDED.population,
        updated_at = now()
      `,
      [code, nom, popDepartements.get(reduire(nom)) ?? null],
    );
  }

  const [{ total }] = await dataSource.query(
    `SELECT COUNT(*)::int AS total FROM departements WHERE geometry IS NOT NULL`,
  );

  return { communesRenseignees, departements: total };
}

async function majPopulationCommune(
  dataSource: DataSource,
  nom: string,
  population: number,
): Promise<{ affectees: number }> {
  const resultat = await dataSource.query(
    `UPDATE communes SET population = $2, updated_at = now() WHERE nom = $1`,
    [nom, population],
  );
  // node-postgres renvoie [rows, rowCount] pour un UPDATE.
  const rowCount = Array.isArray(resultat) ? Number(resultat[1] ?? 0) : 0;
  return { affectees: rowCount };
}

/**
 * Lit un fichier de population et renvoie `libellé → total`.
 *
 * Le fichier porte 58 colonnes de ventilation par sexe et tranche d'âge ;
 * seule la colonne de total (`T_TL`) est utilisée ici. Les autres restent
 * disponibles dans `data/` pour une standardisation par âge ultérieure.
 */
function lireCsv(fichier: string, colonneNom: string): Map<string, number> {
  const contenu = readFileSync(resoudreChemin(fichier), 'utf8');
  const lignes = contenu.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const entetes = decouper(lignes[0].replace(/^﻿/, ''));

  const iNom = entetes.indexOf(colonneNom);
  const iTotal = entetes.indexOf('T_TL');
  if (iNom === -1 || iTotal === -1) {
    throw new Error(
      `Colonnes « ${colonneNom} » et « T_TL » attendues dans ${fichier}, ` +
        `trouvé : ${entetes.slice(0, 8).join(', ')}…`,
    );
  }

  const table = new Map<string, number>();
  for (const ligne of lignes.slice(1)) {
    const champs = decouper(ligne);
    const nombre = Number(champs[iTotal]);
    if (champs[iNom] && Number.isFinite(nombre)) {
      table.set(reduire(champs[iNom]), Math.round(nombre));
    }
  }
  return table;
}

/** Découpage CSV minimal : gère les champs entre guillemets. */
function decouper(ligne: string): string[] {
  const champs: string[] = [];
  let courant = '';
  let dansGuillemets = false;

  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else {
        dansGuillemets = !dansGuillemets;
      }
    } else if (c === ',' && !dansGuillemets) {
      champs.push(courant.trim());
      courant = '';
    } else {
      courant += c;
    }
  }
  champs.push(courant.trim());
  return champs;
}

/**
 * Forme comparable d'un libellé de territoire : sans accents, sans casse,
 * sans apostrophes ni tirets. « N'Dali », « N'dali » et « Ndali » coïncident.
 */
function reduire(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Même stratégie que le seed des communes : dev, dist, ou racine du dépôt. */
function resoudreChemin(fichier: string): string {
  const candidats = [
    join(process.cwd(), 'data', fichier),
    join(__dirname, '..', '..', '..', 'data', fichier),
    join(__dirname, '..', '..', '..', '..', 'data', fichier),
  ];
  for (const candidat of candidats) {
    try {
      readFileSync(candidat);
      return candidat;
    } catch {
      // on essaie le chemin suivant
    }
  }
  throw new Error(
    `Fichier data/${fichier} introuvable. ` +
      `Téléchargez le jeu COD-PS Bénin (voir docs/CARTOGRAPHIE.md).`,
  );
}
