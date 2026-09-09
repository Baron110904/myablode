import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import {
  FiltresCarteDto,
  FiltresStatsDto,
  NiveauCarte,
  resoudrePeriode,
} from './dto/filtres.dto';

/**
 * Un « cas détecté » est un dépistage dont le résultat est diabète, obésité
 * ou une autre endocrinopathie. Le pré-diabète est suivi séparément : c'est
 * un facteur de risque réversible, pas un cas déclaré.
 */
const RESULTATS_POSITIFS = ['diabete', 'obesite', 'autre'];

const TTL_COURT = 300; // 5 min — chiffres publics (section 3.1.1)
const TTL_LONG = 900; // 15 min — agrégats lourds par commune

export interface ResumeStats {
  totalDepistages: number;
  casDetectes: number;
  communesCouvertes: number;
  totalCommunes: number;
  campagnesRealisees: number;
  tauxPrevalence: number;
  preDiabete: number;
  orientesCentre: number;
  variationDepistages7j: number;
  variationCas7j: number;
}

export interface StatCommune {
  id: number;
  nom: string;
  departement: string | null;
  code: string | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
  depistages: number;
  cas: number;
  diabete: number;
  obesite: number;
  taux: number;
  derniere_campagne: string | null;
}

export interface PointEvolution {
  periode: string;
  depistages: number;
  cas: number;
}

export interface RepartitionAgeSexe {
  tranche: string;
  hommes: number;
  femmes: number;
}

export type FenetreDirect = '30s' | '5min' | '1h' | '24h' | '7j';

/**
 * Découpage de chaque fenêtre du suivi en direct.
 *
 * Le nombre d'intervalles reste proche de 40 quelle que soit la fenêtre : le
 * graphe garde ainsi la même densité, et passer de 1 h à 7 j change l'échelle
 * de temps sans redessiner un tracé de forme différente.
 */
const FENETRES: Record<FenetreDirect, { intervalle: string; intervalles: number }> = {
  '30s': { intervalle: '1 second', intervalles: 30 },
  '5min': { intervalle: '10 seconds', intervalles: 30 },
  '1h': { intervalle: '2 minutes', intervalles: 30 },
  '24h': { intervalle: '40 minutes', intervalles: 36 },
  '7j': { intervalle: '4 hours', intervalles: 42 },
};

export interface PointDirect {
  borne: string;
  depistages: number;
  cas: number;
  communes: number;
}

export interface LigneDirect {
  commune_id: number;
  nom: string;
  depistages: number;
  cas: number;
  taux: number;
  /** Dépistages arrivés sur la fenêtre courante ; 0 si la commune est au repos. */
  arrivees: number;
}

export interface SuiviDirect {
  fenetre: FenetreDirect;
  horodatage: string;
  serie: PointDirect[];
  surFenetre: number;
  casFenetre: number;
  tauxFenetre: number;
  /** Communes distinctes touchées sur la fenêtre. */
  communesFenetre: number;
  cumulJour: number;
  casJour: number;
  communesJour: number;
  totalCommunes: number;
  classement: LigneDirect[];
  dernierSignal: { commune: string; horodatage: string } | null;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
    private readonly settings: SettingsService,
  ) {}

  /** Chiffres clés de la page d'accueil et du tableau de bord. */
  async resume(filtres: FiltresStatsDto): Promise<ResumeStats> {
    return this.cache.remember(filtres.toCacheKey('stats:resume'), TTL_COURT, async () => {
      const { where, params } = this.construireFiltre(filtres);

      const [ligne] = await this.dataSource.query(
        `
        SELECT
          COUNT(*)::int AS total_depistages,
          COUNT(*) FILTER (WHERE d.resultat = ANY($${params.length + 1}))::int AS cas_detectes,
          COUNT(*) FILTER (WHERE d.resultat = 'pre-diabete')::int AS pre_diabete,
          COUNT(*) FILTER (WHERE d.oriente_centre)::int AS orientes_centre,
          COUNT(DISTINCT d.commune_id)::int AS communes_couvertes
        FROM depistages d
        WHERE ${where}
        `,
        [...params, RESULTATS_POSITIFS],
      );

      const [{ total_communes }] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total_communes FROM communes`,
      );
      const [{ campagnes_realisees }] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS campagnes_realisees FROM campagnes WHERE statut <> 'planifiee'`,
      );

      const variations = await this.variationsHebdomadaires(filtres);
      const total = ligne.total_depistages;

      return {
        totalDepistages: total,
        casDetectes: ligne.cas_detectes,
        preDiabete: ligne.pre_diabete,
        orientesCentre: ligne.orientes_centre,
        communesCouvertes: ligne.communes_couvertes,
        totalCommunes: total_communes,
        campagnesRealisees: campagnes_realisees,
        tauxPrevalence: total > 0 ? arrondir((ligne.cas_detectes / total) * 100) : 0,
        variationDepistages7j: variations.depistages,
        variationCas7j: variations.cas,
      };
    });
  }

  /** Agrégats par commune : alimente la carte choroplèthe et le tableau. */
  async parCommune(filtres: FiltresStatsDto): Promise<StatCommune[]> {
    return this.cache.remember(
      filtres.toCacheKey('stats:communes'),
      TTL_LONG,
      async () => {
        const { where, params } = this.construireFiltre(filtres, 'd');
        return this.dataSource.query(
          `
          SELECT
            c.id, c.nom, c.departement, c.code, c.centroid_lat, c.centroid_lng,
            COUNT(d.id)::int AS depistages,
            COUNT(d.id) FILTER (WHERE d.resultat = ANY($${params.length + 1}))::int AS cas,
            COUNT(d.id) FILTER (WHERE d.resultat = 'diabete')::int AS diabete,
            COUNT(d.id) FILTER (WHERE d.resultat = 'obesite')::int AS obesite,
            CASE WHEN COUNT(d.id) > 0
              THEN ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.resultat = ANY($${params.length + 1})) / COUNT(d.id), 1)
              ELSE 0 END::float AS taux,
            MAX(d.date_depistage)::text AS derniere_campagne
          FROM communes c
          LEFT JOIN depistages d ON d.commune_id = c.id AND ${where}
          GROUP BY c.id
          ORDER BY c.nom
          `,
          [...params, RESULTATS_POSITIFS],
        );
      },
    );
  }

  /**
   * GeoJSON prêt à consommer par Leaflet, géométries incluses.
   *
   * Deux découpages possibles. Les départements ne sont pas un second jeu de
   * contours téléchargé : ils sont pré-fusionnés à partir des communes au
   * seed, ce qui évite un `ST_Union` de 400 ms à chaque cache froid.
   *
   * `couverture` — dépistés pour 1 000 habitants — est le seul indicateur que
   * la population autorise honnêtement. Le taux de positivité, lui, porte sur
   * les personnes dépistées et ne dit rien de la prévalence réelle : celles
   * qui viennent se faire dépister ne sont pas un échantillon au hasard.
   */
  async carteGeoJson(filtres: FiltresCarteDto): Promise<unknown> {
    const parDepartement = filtres.niveau === NiveauCarte.DEPARTEMENT;

    return this.cache.remember(
      filtres.toCacheKey('stats:geojson'),
      TTL_LONG,
      async () => {
        const { where, params } = this.construireFiltre(filtres, 'd');
        const positifs = `$${params.length + 1}`;

        // Seule la source des territoires change ; les agrégats sont identiques.
        const territoires = parDepartement
          ? `FROM departements t
             LEFT JOIN communes c ON c.departement = t.nom
             LEFT JOIN depistages d ON d.commune_id = c.id AND ${where}`
          : `FROM communes t
             LEFT JOIN depistages d ON d.commune_id = t.id AND ${where}`;

        const departementDuTerritoire = parDepartement ? 't.nom' : 't.departement';

        const [{ geojson }] = await this.dataSource.query(
          `
          WITH agregats AS (
            SELECT
              t.id, t.nom, t.code, t.geometry, t.population,
              ${departementDuTerritoire} AS departement,
              COUNT(d.id)::int AS depistages,
              COUNT(d.id) FILTER (WHERE d.resultat = ANY(${positifs}))::int AS cas,
              COUNT(d.id) FILTER (WHERE d.resultat = 'diabete')::int AS diabete,
              COUNT(d.id) FILTER (WHERE d.resultat = 'obesite')::int AS obesite,
              CASE WHEN COUNT(d.id) > 0
                THEN ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.resultat = ANY(${positifs})) / COUNT(d.id), 1)
                ELSE 0 END::float AS taux,
              CASE WHEN t.population > 0
                THEN ROUND(1000.0 * COUNT(d.id) / t.population, 2)
                ELSE NULL END::float AS couverture,
              MAX(d.date_depistage)::text AS derniere_campagne
            ${territoires}
            GROUP BY t.id
          )
          SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
              json_build_object(
                'type', 'Feature',
                'id', a.id,
                'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(a.geometry, 0.002))::json,
                'properties', json_build_object(
                  'id', a.id, 'nom', a.nom, 'departement', a.departement, 'code', a.code,
                  'depistages', a.depistages, 'cas', a.cas, 'diabete', a.diabete,
                  'obesite', a.obesite, 'taux', a.taux,
                  'population', a.population, 'couverture', a.couverture,
                  'niveau', '${filtres.niveau}',
                  'derniere_campagne', a.derniere_campagne
                )
              )
            ), '[]'::json)
          ) AS geojson
          FROM agregats a
          `,
          [...params, RESULTATS_POSITIFS],
        );
        return geojson;
      },
    );
  }

  /**
   * Série temporelle. Granularité automatique : au jour sur 7 et 30 jours,
   * au mois au-delà — un graphique de 365 points serait illisible.
   */
  async evolution(filtres: FiltresStatsDto): Promise<PointEvolution[]> {
    return this.cache.remember(
      filtres.toCacheKey('stats:evolution'),
      TTL_COURT,
      async () => {
        const { where, params } = this.construireFiltre(filtres);
        const granularite =
          filtres.periode === '7j' || filtres.periode === '30j' ? 'day' : 'month';

        return this.dataSource.query(
          `
          SELECT
            to_char(date_trunc('${granularite}', d.date_depistage), 'YYYY-MM-DD') AS periode,
            COUNT(*)::int AS depistages,
            COUNT(*) FILTER (WHERE d.resultat = ANY($${params.length + 1}))::int AS cas
          FROM depistages d
          WHERE ${where}
          GROUP BY 1
          ORDER BY 1
          `,
          [...params, RESULTATS_POSITIFS],
        );
      },
    );
  }

  /** Pyramide des âges croisée avec le sexe (figure 2 de la page Résultats). */
  async repartitionAgeSexe(filtres: FiltresStatsDto): Promise<RepartitionAgeSexe[]> {
    return this.cache.remember(
      filtres.toCacheKey('stats:agesexe'),
      TTL_COURT,
      async () => {
        const { where, params } = this.construireFiltre(filtres);
        const lignes: RepartitionAgeSexe[] = await this.dataSource.query(
          `
          SELECT
            CASE
              WHEN age < 25 THEN '15-24'
              WHEN age < 35 THEN '25-34'
              WHEN age < 45 THEN '35-44'
              WHEN age < 55 THEN '45-54'
              WHEN age < 65 THEN '55-64'
              ELSE '65 +'
            END AS tranche,
            COUNT(*) FILTER (WHERE sexe = 'M')::int AS hommes,
            COUNT(*) FILTER (WHERE sexe = 'F')::int AS femmes
          FROM (
            SELECT d.sexe,
                   EXTRACT(YEAR FROM AGE(d.date_depistage, d.date_naissance))::int AS age
            FROM depistages d
            WHERE ${where}
          ) t
          GROUP BY 1
          `,
          params,
        );

        const ordre = ['15-24', '25-34', '35-44', '45-54', '55-64', '65 +'];
        const parTranche = new Map(lignes.map((ligne) => [ligne.tranche, ligne]));
        return ordre.map(
          (tranche) =>
            parTranche.get(tranche) ?? { tranche, hommes: 0, femmes: 0 },
        );
      },
    );
  }

  /** Top N des communes par taux de prévalence, effectif minimal exigé. */
  async topCommunes(filtres: FiltresStatsDto, limite = 5): Promise<StatCommune[]> {
    const communes = await this.parCommune(filtres);
    return communes
      // Un taux calculé sur 3 dépistages n'a aucune valeur : on l'écarte.
      .filter((commune) => commune.depistages >= 30)
      .sort((a, b) => b.taux - a.taux)
      .slice(0, limite);
  }

  /** Communes dépassant le seuil d'alerte configuré (tableau de bord). */
  async alertes(filtres: FiltresStatsDto): Promise<StatCommune[]> {
    const seuil = await this.settings.getNumber('seuil_alerte_prevalence', 10);
    const communes = await this.parCommune(filtres);
    return communes
      .filter((commune) => commune.depistages >= 30 && commune.taux > seuil)
      .sort((a, b) => b.taux - a.taux);
  }

  /** Points individuels pour la couche « marqueurs » de la carte admin. */
  async points(
    filtres: FiltresStatsDto,
    limite = 3000,
  ): Promise<Array<{ lat: number; lng: number; resultat: string; type: string }>> {
    const { where, params } = this.construireFiltre(filtres);
    return this.dataSource.query(
      `
      SELECT ST_Y(d.localisation)::float AS lat,
             ST_X(d.localisation)::float AS lng,
             d.resultat, d.type
      FROM depistages d
      WHERE ${where} AND d.localisation IS NOT NULL
      ORDER BY d.date_depistage DESC
      LIMIT $${params.length + 1}
      `,
      [...params, limite],
    );
  }

  /**
   * Derniers dépistages enregistrés, pour l'animation de la carte.
   *
   * Deux niveaux de détail, et la différence est volontaire :
   *
   * — Public : commune, centroïde et horodatage. Ni résultat, ni glycémie.
   *   Annoncer « un cas de diabète vient d'être détecté à X » sur un site
   *   ouvert renseignerait sur une personne dans une petite commune.
   * — Interne : le résultat et la mesure, utiles au pilotage des équipes.
   *
   * Le centroïde communal est renvoyé plutôt que la position du dépistage :
   * c'est ce qui permet de faire réagir la commune sur la carte sans révéler
   * où la personne a été vue.
   */
  async derniersDepistages(
    limite = 20,
    detaille = false,
  ): Promise<
    Array<{
      id: number;
      commune: string;
      commune_id: number;
      lat: number | null;
      lng: number | null;
      horodatage: string;
      resultat?: string;
      glycemie?: number | null;
    }>
  > {
    const colonnesDetail = detaille
      ? `, d.resultat, d.glycemie::float AS glycemie`
      : '';

    return this.dataSource.query(
      `
      SELECT d.id,
             c.nom AS commune,
             c.id AS commune_id,
             c.centroid_lat::float AS lat,
             c.centroid_lng::float AS lng,
             d.created_at AS horodatage${colonnesDetail}
      FROM depistages d
      JOIN communes c ON c.id = d.commune_id
      WHERE d.deleted_at IS NULL
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT $1
      `,
      [Math.min(limite, 100)],
    );
  }

  /**
   * Suivi en direct : ce qui est arrivé sur la plateforme, découpé en
   * intervalles réguliers sur une fenêtre glissante.
   *
   * L'horodatage retenu est `created_at`, l'arrivée de la donnée, et non
   * `date_depistage`, la date de l'examen. Les deux diffèrent : un dépistage
   * fait le matin peut n'arriver qu'au soir, quand l'agent retrouve du réseau.
   * Un suivi « en direct » parle du flux entrant, donc de l'arrivée.
   *
   * Aucun cache : mettre en cache un direct le rendrait faux. Les requêtes
   * portent sur une fenêtre courte et s'appuient sur l'index de `created_at`.
   */
  async direct(fenetre: FenetreDirect): Promise<SuiviDirect> {
    const { intervalle, intervalles } = FENETRES[fenetre];

    /*
     * `generate_series` produit tous les intervalles, y compris vides : sans
     * lui, une heure creuse disparaîtrait du graphe et le tracé se resserrerait
     * comme si le flux n'avait jamais cessé.
     */
    const serie: PointDirect[] = await this.dataSource.query(
      `
      WITH ancre AS (
        SELECT date_bin($1::interval, now(), timestamp '2000-01-01') AS fin
      ),
      bornes AS (
        SELECT generate_series(
          (SELECT fin FROM ancre) - ($1::interval * $2::int),
          (SELECT fin FROM ancre),
          $1::interval
        ) AS borne
      )
      SELECT b.borne,
             COUNT(d.id)::int AS depistages,
             COUNT(d.id) FILTER (WHERE d.resultat = ANY($3))::int AS cas,
             COUNT(DISTINCT d.commune_id)::int AS communes
      FROM bornes b
      LEFT JOIN depistages d
        ON d.deleted_at IS NULL
       AND d.created_at >= b.borne
       AND d.created_at < b.borne + $1::interval
      GROUP BY b.borne
      ORDER BY b.borne
      `,
      [intervalle, intervalles, RESULTATS_POSITIFS],
    );

    /*
     * Jour et fenêtre comptés d'un seul passage. Les deux sont nécessaires :
     * la fenêtre décrit ce que le graphe montre, le jour donne le repère
     * habituel d'un responsable de campagne — et les deux diffèrent dès que la
     * fenêtre dépasse minuit.
     */
    const [totaux] = await this.dataSource.query(
      `
      SELECT COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int
               AS depistages_jour,
             COUNT(*) FILTER (
               WHERE created_at >= date_trunc('day', now())
                 AND resultat = ANY($1)
             )::int AS cas_jour,
             COUNT(DISTINCT commune_id) FILTER (
               WHERE created_at >= date_trunc('day', now())
             )::int AS communes_jour,
             COUNT(DISTINCT commune_id) FILTER (
               WHERE created_at >= now() - ($2::interval * $3::int)
             )::int AS communes_fenetre
      FROM depistages
      WHERE deleted_at IS NULL
        AND created_at >= LEAST(
          date_trunc('day', now()),
          now() - ($2::interval * $3::int)
        )
      `,
      [RESULTATS_POSITIFS, intervalle, intervalles],
    );

    /*
     * Classement des communes qui ont bougé sur la fenêtre. `arrivees` peut
     * valoir 0 : la commune reste au classement avec son taux cumulé, mais
     * l'interface n'affichera pas de variation — il n'y en a pas eu.
     */
    const classement: LigneDirect[] = await this.dataSource.query(
      `
      SELECT c.id AS commune_id,
             c.nom,
             COUNT(d.id)::int AS depistages,
             COUNT(d.id) FILTER (WHERE d.resultat = ANY($1))::int AS cas,
             ROUND(
               100.0 * COUNT(d.id) FILTER (WHERE d.resultat = ANY($1))
               / GREATEST(COUNT(d.id), 1), 1
             )::float AS taux,
             COUNT(d.id) FILTER (
               WHERE d.created_at >= now() - ($2::interval * $3::int)
             )::int AS arrivees
      FROM communes c
      JOIN depistages d ON d.commune_id = c.id AND d.deleted_at IS NULL
      GROUP BY c.id, c.nom
      ORDER BY arrivees DESC, taux DESC, depistages DESC
      LIMIT 12
      `,
      [RESULTATS_POSITIFS, intervalle, intervalles],
    );

    const [totalCommunes] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM communes`,
    );

    const [dernier] = await this.dataSource.query(
      `
      SELECT c.nom AS commune, d.created_at AS horodatage
      FROM depistages d
      JOIN communes c ON c.id = d.commune_id
      WHERE d.deleted_at IS NULL
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT 1
      `,
    );

    const surFenetre = serie.reduce((somme, point) => somme + point.depistages, 0);
    const casFenetre = serie.reduce((somme, point) => somme + point.cas, 0);

    return {
      fenetre,
      horodatage: new Date().toISOString(),
      serie,
      surFenetre,
      casFenetre,
      tauxFenetre:
        surFenetre > 0 ? Math.round((1000 * casFenetre) / surFenetre) / 10 : 0,
      communesFenetre: totaux.communes_fenetre,
      cumulJour: totaux.depistages_jour,
      casJour: totaux.cas_jour,
      communesJour: totaux.communes_jour,
      totalCommunes: totalCommunes.total,
      classement,
      dernierSignal: dernier ?? null,
    };
  }

  /** Répartition par type de dépistage et par résultat. */
  async repartitions(filtres: FiltresStatsDto) {
    return this.cache.remember(
      filtres.toCacheKey('stats:repartitions'),
      TTL_COURT,
      async () => {
        const { where, params } = this.construireFiltre(filtres);
        const [parType, parResultat, parSource] = await Promise.all([
          this.dataSource.query(
            `SELECT d.type AS cle, COUNT(*)::int AS total FROM depistages d WHERE ${where} GROUP BY 1 ORDER BY 2 DESC`,
            params,
          ),
          this.dataSource.query(
            `SELECT d.resultat AS cle, COUNT(*)::int AS total FROM depistages d WHERE ${where} GROUP BY 1 ORDER BY 2 DESC`,
            params,
          ),
          this.dataSource.query(
            `SELECT d.source AS cle, COUNT(*)::int AS total FROM depistages d WHERE ${where} GROUP BY 1 ORDER BY 2 DESC`,
            params,
          ),
        ]);
        return { parType, parResultat, parSource };
      },
    );
  }

  /** Évolution mensuelle sur 12 mois, indépendante des filtres (dashboard). */
  async evolutionMensuelle12Mois(): Promise<PointEvolution[]> {
    return this.cache.remember('stats:evolution12', TTL_COURT, async () =>
      this.dataSource.query(
        `
        SELECT to_char(serie.mois, 'YYYY-MM') AS periode,
               COALESCE(agg.depistages, 0)::int AS depistages,
               COALESCE(agg.cas, 0)::int AS cas
        FROM generate_series(
               date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
               date_trunc('month', CURRENT_DATE),
               INTERVAL '1 month'
             ) AS serie(mois)
        LEFT JOIN (
          SELECT date_trunc('month', date_depistage) AS mois,
                 COUNT(*)::int AS depistages,
                 COUNT(*) FILTER (WHERE resultat = ANY($1))::int AS cas
          FROM depistages
          WHERE deleted_at IS NULL
          GROUP BY 1
        ) agg ON agg.mois = serie.mois
        ORDER BY serie.mois
        `,
        [RESULTATS_POSITIFS],
      ),
    );
  }

  /** Compare les 7 derniers jours aux 7 précédents (badges « +128 / semaine »). */
  private async variationsHebdomadaires(
    filtres: FiltresStatsDto,
  ): Promise<{ depistages: number; cas: number }> {
    const conditionsSupplementaires: string[] = [];
    const params: unknown[] = [RESULTATS_POSITIFS];
    if (filtres.type) {
      params.push(filtres.type);
      conditionsSupplementaires.push(`type = $${params.length}`);
    }
    const extra =
      conditionsSupplementaires.length > 0
        ? ` AND ${conditionsSupplementaires.join(' AND ')}`
        : '';

    const [ligne] = await this.dataSource.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE date_depistage >= CURRENT_DATE - INTERVAL '7 days')::int AS d_recent,
        COUNT(*) FILTER (WHERE date_depistage >= CURRENT_DATE - INTERVAL '14 days'
                           AND date_depistage < CURRENT_DATE - INTERVAL '7 days')::int AS d_precedent,
        COUNT(*) FILTER (WHERE resultat = ANY($1)
                           AND date_depistage >= CURRENT_DATE - INTERVAL '7 days')::int AS c_recent,
        COUNT(*) FILTER (WHERE resultat = ANY($1)
                           AND date_depistage >= CURRENT_DATE - INTERVAL '14 days'
                           AND date_depistage < CURRENT_DATE - INTERVAL '7 days')::int AS c_precedent
      FROM depistages
      WHERE deleted_at IS NULL${extra}
      `,
      params,
    );

    return {
      depistages: ligne.d_recent - ligne.d_precedent,
      cas: ligne.c_recent - ligne.c_precedent,
    };
  }

  /**
   * Construit la clause WHERE partagée. Toutes les valeurs passent par des
   * paramètres numérotés : aucune interpolation de données utilisateur.
   */
  private construireFiltre(
    filtres: FiltresStatsDto,
    alias = 'd',
  ): { where: string; params: unknown[] } {
    const conditions = [`${alias}.deleted_at IS NULL`];
    const params: unknown[] = [];

    const { debut, fin } = resoudrePeriode(filtres);
    if (debut) {
      params.push(debut);
      conditions.push(`${alias}.date_depistage >= $${params.length}`);
    }
    if (fin) {
      params.push(fin);
      conditions.push(`${alias}.date_depistage <= $${params.length}`);
    }
    if (filtres.type) {
      params.push(filtres.type);
      conditions.push(`${alias}.type = $${params.length}`);
    }
    if (filtres.sexe) {
      params.push(filtres.sexe);
      conditions.push(`${alias}.sexe = $${params.length}`);
    }
    if (filtres.communeId) {
      params.push(filtres.communeId);
      conditions.push(`${alias}.commune_id = $${params.length}`);
    }
    if (filtres.campagneId) {
      params.push(filtres.campagneId);
      conditions.push(`${alias}.campagne_id = $${params.length}`);
    }
    if (filtres.ageMin !== undefined) {
      params.push(filtres.ageMin);
      conditions.push(
        `EXTRACT(YEAR FROM AGE(${alias}.date_depistage, ${alias}.date_naissance)) >= $${params.length}`,
      );
    }
    if (filtres.ageMax !== undefined) {
      params.push(filtres.ageMax);
      conditions.push(
        `EXTRACT(YEAR FROM AGE(${alias}.date_depistage, ${alias}.date_naissance)) <= $${params.length}`,
      );
    }

    return { where: conditions.join(' AND '), params };
  }
}

function arrondir(valeur: number): number {
  return Math.round(valeur * 10) / 10;
}
