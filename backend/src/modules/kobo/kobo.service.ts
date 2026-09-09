import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { genererCodeDepistage } from 'src/common/code-depistage';
import { calculerImc } from 'src/common/normalisation';
import {
  deduireChampCible,
  deduireMapping,
  reduireNomChamp,
} from 'src/common/correspondance-champs';
import {
  motifHorsNorme,
  normaliserBooleen,
  normaliserDate,
  normaliserGlycemie,
  normaliserNombre,
  normaliserSexe,
  normaliserTexte,
  normaliserType,
} from 'src/common/normalisation';
import {
  Campagne,
  DepistageSource,
  DepistageType,
  KoboConfig,
  KoboSyncLog,
  SyncLogStatut,
  SyncStatus,
} from 'src/database/entities';
import { DepistagesService } from 'src/modules/depistages/depistages.service';
import { CommunesService } from 'src/modules/communes/communes.service';
import {
  KoboClientService,
  KoboSubmission,
  ResultatTestConnexion,
} from './kobo-client.service';
import {
  MAPPING_PAR_DEFAUT,
  TestConnexionDto,
  UpdateKoboConfigDto,
} from './dto/kobo.dto';

export interface ResultatSync {
  statut: SyncLogStatut;
  recus: number;
  importes: number;
  doublons: number;
  erreurs: number;
  dureeMs: number;
  message: string;
  echantillonErreurs: Array<{ koboId: string; raison: string }>;
}

@Injectable()
export class KoboService {
  private readonly logger = new Logger(KoboService.name);
  /** Verrou mémoire : deux synchronisations simultanées créeraient des doublons. */
  private syncEnCours = false;

  constructor(
    @InjectRepository(KoboConfig)
    private readonly configRepo: Repository<KoboConfig>,
    @InjectRepository(KoboSyncLog)
    private readonly logsRepo: Repository<KoboSyncLog>,
    @InjectRepository(Campagne)
    private readonly campagnesRepo: Repository<Campagne>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly client: KoboClientService,
    private readonly communes: CommunesService,
    private readonly depistages: DepistagesService,
    private readonly cache: CacheService,
  ) {}

  /** Configuration courante ; la ligne est créée à la volée si absente. */
  async getConfig(): Promise<KoboConfig> {
    let config = await this.configRepo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      config = await this.configRepo.save(
        this.configRepo.create({ api_url: 'https://kf.kobotoolbox.org' }),
      );
    }
    return config;
  }

  /** Version destinée au client : le jeton n'est jamais renvoyé en clair. */
  async getConfigPublique(): Promise<
    Omit<KoboConfig, 'api_token'> & { token_configure: boolean }
  > {
    const config = await this.getConfig();
    const { api_token, ...reste } = config;
    return { ...reste, token_configure: Boolean(api_token) };
  }

  async updateConfig(dto: UpdateKoboConfigDto): Promise<KoboConfig> {
    const config = await this.getConfig();

    if (dto.api_url !== undefined) config.api_url = dto.api_url.trim();
    if (dto.form_id !== undefined) config.form_id = dto.form_id.trim() || null;
    if (dto.sync_interval !== undefined) config.sync_interval = dto.sync_interval;
    if (dto.auto_sync_enabled !== undefined) {
      config.auto_sync_enabled = dto.auto_sync_enabled;
    }
    if (dto.field_mapping !== undefined) config.field_mapping = dto.field_mapping;
    // Un champ jeton laissé vide signifie « ne pas modifier », pas « effacer ».
    if (dto.api_token) config.api_token = dto.api_token.trim();

    return this.configRepo.save(config);
  }

  async testerConnexion(dto: TestConnexionDto): Promise<ResultatTestConnexion> {
    const config = await this.getConfig();
    const resultat = await this.client.tester(
      dto.api_url ?? config.api_url,
      dto.api_token || config.api_token || '',
      dto.form_id ?? config.form_id ?? undefined,
    );

    /*
     * Proposer la correspondance devinée plutôt que des listes vides.
     * La synchronisation sait reconnaître les champs seule, mais
     * l'administrateur doit voir ce qui a été déduit — et pouvoir le
     * corriger — au lieu de croire qu'aucun champ n'est associé.
     */
    if (resultat.champs?.length) {
      const enregistre = config.field_mapping ?? {};
      resultat.mappingSuggere = {
        ...deduireMapping(resultat.champs),
        ...enregistre,
      };
    }

    return resultat;
  }

  /**
   * Synchronisation complète : récupération, mapping, dédoublonnage,
   * insertion (section 3.2.3.A « Traitement »).
   */
  async synchroniser(
    declencheur: 'manuel' | 'cron',
    complet = false,
  ): Promise<ResultatSync> {
    if (this.syncEnCours) {
      throw new BadRequestException('Une synchronisation est déjà en cours.');
    }

    const config = await this.getConfig();
    if (!config.api_token || !config.form_id) {
      throw new BadRequestException(
        'Configuration Kobo incomplète : renseignez le jeton API et l’identifiant du formulaire.',
      );
    }

    this.syncEnCours = true;
    const debut = Date.now();
    await this.configRepo.update(config.id, {
      last_sync_status: SyncStatus.EN_COURS,
    });

    try {
      // Incrémental : on ne redemande que les soumissions postérieures à la
      // dernière synchro réussie, avec 1 h de marge pour les envois différés.
      const depuis =
        !complet && config.last_sync_at
          ? new Date(config.last_sync_at.getTime() - 60 * 60 * 1000)
          : undefined;

      const soumissions = await this.client.recupererSoumissions(
        config.api_url,
        config.api_token,
        config.form_id,
        50_000,
        depuis,
      );

      const resultat = await this.importerSoumissions(soumissions, config);
      const dureeMs = Date.now() - debut;

      /*
       * Une synchronisation qui rejette tout n'est pas une réussite.
       *
       * Le statut valait « succès » dès lors que l'appel réseau aboutissait :
       * un formulaire dont aucun champ n'était reconnu affichait « tout va
       * bien » tout en n'important rien. L'administrateur n'avait aucun moyen
       * de s'en apercevoir depuis le tableau de bord.
       */
      const rienImporte = resultat.importes === 0 && resultat.erreurs > 0;
      const statut = rienImporte ? SyncLogStatut.ERREUR : SyncLogStatut.SUCCES;
      const message = rienImporte
        ? `${resultat.message} Aucune donnée enregistrée : vérifiez la correspondance des champs dans Paramètres → KoboToolbox.`
        : resultat.message;

      await this.configRepo.update(config.id, {
        last_sync_at: new Date(),
        last_sync_status: rienImporte ? SyncStatus.ERREUR : SyncStatus.SUCCES,
        last_sync_count: resultat.importes,
        last_sync_message: message,
      });
      await this.enregistrerLog(declencheur, statut, {
        ...resultat,
        message,
        dureeMs,
      });
      await this.cache.invalidate('stats:');

      return { ...resultat, message, dureeMs, statut };
    } catch (error) {
      const message = (error as Error).message;
      const dureeMs = Date.now() - debut;

      await this.configRepo.update(config.id, {
        last_sync_status: SyncStatus.ERREUR,
        last_sync_message: message,
      });
      await this.enregistrerLog(declencheur, SyncLogStatut.ERREUR, {
        recus: 0,
        importes: 0,
        doublons: 0,
        erreurs: 0,
        dureeMs,
        message,
        echantillonErreurs: [],
      });

      this.logger.error(`Synchronisation Kobo échouée : ${message}`);
      throw error;
    } finally {
      this.syncEnCours = false;
    }
  }

  private async importerSoumissions(
    soumissions: KoboSubmission[],
    config: KoboConfig,
  ): Promise<Omit<ResultatSync, 'dureeMs' | 'statut'>> {
    const mapping = { ...MAPPING_PAR_DEFAUT, ...(config.field_mapping ?? {}) };
    /*
     * Index des correspondances sur la forme réduite des noms de champs.
     * Kobo nomme ses questions d'après leur libellé en remplaçant accents et
     * espaces par des soulignés : « Prénom » devient `Pr_nom`. Comparer les
     * noms bruts faisait échouer toute correspondance et rejetait chaque
     * soumission avec « Champ nom absent ».
     */
    const mappingReduit = new Map<string, string>();
    for (const [champ, cible] of Object.entries(mapping)) {
      mappingReduit.set(reduireNomChamp(champ), cible);
    }
    const communes = await this.chargerCommunes();

    let importes = 0;
    let doublons = 0;
    const erreurs: Array<{ koboId: string; raison: string }> = [];

    for (const soumission of soumissions) {
      const koboId = String(soumission._uuid ?? soumission._id ?? '');
      if (!koboId) {
        erreurs.push({ koboId: '(inconnu)', raison: 'Soumission sans identifiant.' });
        continue;
      }

      try {
        const existe = await this.dataSource.query(
          `SELECT 1 FROM depistages WHERE kobo_id = $1 LIMIT 1`,
          [koboId],
        );
        if (existe.length > 0) {
          doublons += 1;
          continue;
        }

        const converti = await this.convertir(
          soumission,
          koboId,
          mapping,
          mappingReduit,
          communes,
        );
        if ('erreur' in converti) {
          erreurs.push({ koboId, raison: converti.erreur });
          continue;
        }

        await this.dataSource.query(
          `INSERT INTO depistages
            (commune_id, campagne_id, code_unique, nom, prenom, date_naissance, sexe,
             telephone, date_depistage, type, glycemie, imc, poids, taille, resultat,
             oriente_centre, notes, source, kobo_id, hors_norme, motif_hors_norme,
             localisation)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$21,$22,$13,$14,$15,$16,$17,
             $20::varchar IS NOT NULL, $20::varchar,
             CASE WHEN $18::float IS NULL THEN NULL
                  ELSE ST_SetSRID(ST_MakePoint($19::float, $18::float), 4326) END)
           ON CONFLICT (kobo_id) DO NOTHING`,
          [
            converti.commune_id,
            converti.campagne_id,
            converti.code_unique,
            converti.nom,
            converti.prenom,
            converti.date_naissance,
            converti.sexe,
            converti.telephone,
            converti.date_depistage,
            converti.type,
            converti.glycemie,
            converti.imc,
            converti.resultat,
            converti.oriente_centre,
            converti.notes,
            DepistageSource.KOBO,
            koboId,
            converti.latitude,
            converti.longitude,
            converti.motif_hors_norme,
            converti.poids,
            converti.taille,
          ],
        );
        importes += 1;
      } catch (error) {
        erreurs.push({ koboId, raison: (error as Error).message });
      }
    }

    const message =
      `${soumissions.length} soumission(s) reçue(s) · ${importes} importée(s) · ` +
      `${doublons} doublon(s) ignoré(s) · ${erreurs.length} en erreur.`;

    return {
      recus: soumissions.length,
      importes,
      doublons,
      erreurs: erreurs.length,
      message,
      echantillonErreurs: erreurs.slice(0, 20),
    };
  }

  /** Traduit une soumission Kobo en ligne `depistages`, ou explique le rejet. */
  private async convertir(
    soumission: KoboSubmission,
    koboId: string,
    mapping: Record<string, string>,
    mappingReduit: Map<string, string>,
    communes: Map<string, number>,
  ): Promise<Record<string, never> & { erreur: string } | ConversionReussie> {
    const valeurs: Record<string, unknown> = {};

    for (const [champKobo, valeur] of Object.entries(soumission)) {
      if (champKobo.startsWith('_')) continue;

      /*
       * Trois niveaux, du plus explicite au plus tolérant :
       * 1. la correspondance saisie par l'administrateur, telle quelle ;
       * 2. la même, comparée sur la forme réduite — « Nom » et « nom »
       *    désignent le même champ ;
       * 3. la reconnaissance automatique, qui gère les noms techniques
       *    produits par Kobo (« Pr_nom », « Glyc_mie_MG_DL »).
       */
      const cible =
        mapping[champKobo] ??
        mappingReduit.get(reduireNomChamp(champKobo)) ??
        deduireChampCible(champKobo);

      if (cible) valeurs[cible] = valeur;
    }

    const nom = normaliserTexte(valeurs.nom, 100);
    const prenom = normaliserTexte(valeurs.prenom, 100);
    if (!nom) return { erreur: 'Champ « nom » absent ou vide.' } as never;

    const dateNaissance = normaliserDate(valeurs.date_naissance);
    if (!dateNaissance) {
      return { erreur: 'Date de naissance absente ou illisible.' } as never;
    }

    const sexe = normaliserSexe(valeurs.sexe);
    if (!sexe) return { erreur: 'Sexe absent ou non reconnu.' } as never;

    const dateDepistage =
      normaliserDate(valeurs.date_depistage) ??
      normaliserDate(soumission._submission_time);
    if (!dateDepistage) {
      return { erreur: 'Date de dépistage absente ou illisible.' } as never;
    }

    const nomCommune = normaliserTexte(valeurs.commune_id, 100);
    const communeId = nomCommune
      ? (communes.get(cleCommune(nomCommune)) ?? null)
      : null;
    if (nomCommune && communeId === null) {
      return {
        erreur: `Commune « ${nomCommune} » inconnue du référentiel béninois.`,
      } as never;
    }

    /*
     * Les mesures arrivent telles quelles, sans contrôle de plausibilité :
     * l'objectif de la collecte est de tout récupérer. Une valeur aberrante
     * est enregistrée puis corrigée depuis le back-office, plutôt que de
     * faire perdre la ligne entière.
     */
    const glycemie = normaliserGlycemie(valeurs.glycemie);
    const poids = normaliserNombre(valeurs.poids);
    const taille = normaliserNombre(valeurs.taille);

    /*
     * L'IMC est calculé depuis le poids et la taille. Un IMC saisi n'est
     * retenu qu'à défaut de ces deux mesures : les formulaires antérieurs le
     * portaient directement, et leurs soumissions restent exploitables.
     */
    const imc = calculerImc(poids, taille) ?? normaliserNombre(valeurs.imc);

    const type =
      normaliserType(valeurs.type) ??
      (glycemie !== null ? DepistageType.DIABETE : DepistageType.OBESITE);

    const resultat = await this.depistages.deduireResultat({ type, glycemie, imc });

    // Kobo fournit [latitude, longitude] dans _geolocation.
    const geo = soumission._geolocation;
    const latitude = Array.isArray(geo) && typeof geo[0] === 'number' ? geo[0] : null;
    const longitude = Array.isArray(geo) && typeof geo[1] === 'number' ? geo[1] : null;

    return {
      commune_id: communeId,
      campagne_id: communeId
        ? await this.trouverCampagne(communeId, dateDepistage)
        : null,
      /*
       * Le code du terrain d'abord ; à défaut un code lisible est généré.
       * L'identifiant technique de la soumission Kobo servait auparavant de
       * repli : un UUID de 36 caractères, inutilisable sur une fiche.
       */
      code_unique:
        normaliserTexte(valeurs.code_unique, 50) ??
        (await genererCodeDepistage(this.dataSource, dateDepistage)),
      nom,
      prenom: prenom ?? '—',
      date_naissance: dateNaissance,
      sexe,
      telephone: normaliserTexte(valeurs.telephone, 20),
      date_depistage: dateDepistage,
      type,
      glycemie: glycemie?.toFixed(2) ?? null,
      imc: imc?.toFixed(2) ?? null,
      poids: poids?.toFixed(2) ?? null,
      taille: taille?.toFixed(2) ?? null,
      resultat,
      oriente_centre: normaliserBooleen(valeurs.oriente_centre),
      notes: normaliserTexte(valeurs.notes, 2000),
      /*
       * La mesure est acceptée dans tous les cas ; si elle sort du domaine
       * physiologique, la ligne part avec sa consigne de vérification.
       */
      motif_hors_norme: motifHorsNorme(glycemie, imc, poids, taille),
      latitude,
      longitude,
    };
  }

  /**
   * Rattache la soumission à la campagne de la commune couvrant cette date.
   * À défaut, le dépistage reste sans campagne plutôt que d'être rejeté.
   */
  private async trouverCampagne(
    communeId: number,
    dateDepistage: string,
  ): Promise<number | null> {
    const [campagne] = await this.campagnesRepo.query(
      `SELECT id FROM campagnes
       WHERE commune_id = $1
         AND date_debut <= $2
         AND (date_fin IS NULL OR date_fin >= $2)
       ORDER BY date_debut DESC LIMIT 1`,
      [communeId, dateDepistage],
    );
    return campagne?.id ?? null;
  }

  private async chargerCommunes(): Promise<Map<string, number>> {
    const communes = await this.communes.findAll();
    const index = new Map<string, number>();
    for (const commune of communes) {
      index.set(cleCommune(commune.nom), commune.id);
      if (commune.code) index.set(cleCommune(commune.code), commune.id);
    }
    return index;
  }

  async historiqueLogs(limite = 50): Promise<KoboSyncLog[]> {
    return this.logsRepo.find({ order: { created_at: 'DESC' }, take: limite });
  }

  private async enregistrerLog(
    declencheur: 'manuel' | 'cron',
    statut: SyncLogStatut,
    resultat: Omit<ResultatSync, 'statut'>,
  ): Promise<void> {
    await this.logsRepo.insert({
      statut,
      declencheur,
      nb_recus: resultat.recus,
      nb_importes: resultat.importes,
      nb_doublons: resultat.doublons,
      nb_erreurs: resultat.erreurs,
      duree_ms: resultat.dureeMs,
      message: resultat.message,
      details:
        resultat.echantillonErreurs.length > 0
          ? { erreurs: resultat.echantillonErreurs }
          : null,
    });
  }
}

interface ConversionReussie {
  commune_id: number | null;
  campagne_id: number | null;
  code_unique: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  telephone: string | null;
  date_depistage: string;
  type: string;
  glycemie: string | null;
  imc: string | null;
  poids: string | null;
  taille: string | null;
  resultat: string;
  oriente_centre: boolean;
  notes: string | null;
  /** Consigne de vérification si la mesure sort des bornes physiologiques. */
  motif_hors_norme: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Clé de rapprochement : minuscules, sans accents ni ponctuation. */
function cleCommune(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
