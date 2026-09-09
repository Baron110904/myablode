import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { genererCodeDepistage } from 'src/common/code-depistage';
import { calculerImc, motifHorsNorme } from 'src/common/normalisation';
import { PaginatedResult, paginate } from 'src/common/dto/pagination.dto';
import {
  Depistage,
  DepistageResultat,
  DepistageSource,
  DepistageType,
} from 'src/database/entities';
import { SettingsService } from 'src/modules/settings/settings.service';
import {
  CreateDepistageDto,
  QueryDepistagesDto,
  UpdateDepistageDto,
} from './dto/depistage.dto';

const TRIS_AUTORISES = new Set([
  'date_depistage',
  'nom',
  'created_at',
  'resultat',
]);

@Injectable()
export class DepistagesService {
  constructor(
    @InjectRepository(Depistage)
    private readonly repository: Repository<Depistage>,
    private readonly settings: SettingsService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Liste des dépistages.
   *
   * `emailLecteur` restreint le résultat au périmètre d'un compte en lecture :
   * ses propres collectes et celles de son équipe. Le rattachement passe par
   * l'adresse électronique, seul lien entre un compte et une fiche agent —
   * un agent de terrain n'a pas de `user_id` sur ses dépistages.
   *
   * Le périmètre est ajouté ici et non dans les filtres du DTO : un paramètre
   * de requête serait modifiable par l'appelant.
   */
  async findAll(
    query: QueryDepistagesDto,
    emailLecteur?: string,
  ): Promise<PaginatedResult<Depistage>> {
    const builder = this.repository
      .createQueryBuilder('depistage')
      .leftJoinAndSelect('depistage.commune', 'commune')
      .leftJoinAndSelect('depistage.campagne', 'campagne')
      .skip(query.skip)
      .take(query.limit);

    if (emailLecteur) {
      /*
       * Le périmètre est résolu **une fois**, avant la requête principale.
       *
       * La première version l'exprimait en sous-requête corrélée : Postgres
       * rebalayait alors la table `agents` pour chaque dépistage — 11 760
       * parcours séquentiels, 220 ms pour rendre 25 lignes. Les identifiants
       * sont maintenant connus au moment de construire le filtre, qui ne
       * touche plus que des colonnes indexées.
       */
      const perimetre = await this.resoudrePerimetre(emailLecteur);

      if (perimetre.length === 0) {
        // Aucune fiche agent pour ce compte : il ne voit rien.
        builder.andWhere('1 = 0');
      } else {
        const conditions: string[] = ['depistage.agent_id IN (:...agentIds)'];
        const parametres: Record<string, unknown> = {
          agentIds: perimetre.map((p) => p.agentId),
        };

        perimetre.forEach((affectation, rang) => {
          if (affectation.campagneId === null && affectation.communeId === null) return;
          const morceaux: string[] = [];
          if (affectation.campagneId !== null) {
            morceaux.push(`depistage.campagne_id = :campagne${rang}`);
            parametres[`campagne${rang}`] = affectation.campagneId;
          }
          if (affectation.communeId !== null) {
            morceaux.push(`depistage.commune_id = :commune${rang}`);
            parametres[`commune${rang}`] = affectation.communeId;
          }
          conditions.push(`(${morceaux.join(' AND ')})`);
        });

        builder.andWhere(`(${conditions.join(' OR ')})`, parametres);
      }
    }

    this.appliquerFiltres(builder, query);

    // La liste blanche empêche l'injection via le paramètre de tri.
    const tri = TRIS_AUTORISES.has(query.triPar ?? '')
      ? query.triPar!
      : 'date_depistage';
    builder.orderBy(`depistage.${tri}`, query.order).addOrderBy('depistage.id', 'DESC');

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  /**
   * Détail d'un dépistage.
   *
   * `emailLecteur` applique le même périmètre que la liste. Sans lui, un
   * compte en lecture voyait une liste filtrée mais pouvait lire n'importe
   * quelle fiche en devinant son identifiant — les identifiants sont
   * séquentiels, il suffisait de compter.
   *
   * Hors périmètre, la réponse est « introuvable » et non « interdit » :
   * distinguer les deux confirmerait l'existence de la fiche.
   */
  /**
   * Périmètre d'un compte en lecture : sa fiche agent et ses affectations.
   *
   * Une ligne par affectation, plus une ligne sans affectation quand l'agent
   * n'en a aucune — il ne voit alors que ses propres collectes.
   */
  private async resoudrePerimetre(
    email: string,
  ): Promise<Array<{ agentId: number; campagneId: number | null; communeId: number | null }>> {
    return this.repository.manager.query(
      `SELECT a.id AS "agentId",
              af.campagne_id AS "campagneId",
              af.commune_id AS "communeId"
       FROM agents a
       LEFT JOIN agent_affectations af ON af.agent_id = a.id
       WHERE lower(a.email) = lower($1)`,
      [email],
    );
  }

  async findOne(id: number, emailLecteur?: string): Promise<Depistage> {
    const depistage = await this.repository.findOne({
      where: { id },
      relations: { commune: true, campagne: true, user: true },
    });
    if (!depistage) {
      throw new NotFoundException(`Dépistage ${id} introuvable.`);
    }

    if (emailLecteur && !(await this.dansPerimetre(depistage, emailLecteur))) {
      throw new NotFoundException(`Dépistage ${id} introuvable.`);
    }

    return depistage;
  }

  /**
   * Le dépistage relève-t-il du périmètre de ce compte en lecture ?
   *
   * Même condition que le filtre de la liste, exprimée une seule fois en SQL
   * pour que les deux ne puissent pas diverger.
   */
  private async dansPerimetre(
    depistage: Depistage,
    email: string,
  ): Promise<boolean> {
    const [ligne] = await this.repository.manager.query(
      `SELECT EXISTS (
         SELECT 1 FROM agents a
         WHERE lower(a.email) = lower($1)
           AND (
             a.id = $2
             OR EXISTS (
               SELECT 1 FROM agent_affectations af
               WHERE af.agent_id = a.id
                 AND (af.campagne_id IS NULL OR af.campagne_id = $3)
                 AND (af.commune_id IS NULL OR af.commune_id = $4)
             )
           )
       ) AS autorise`,
      [email, depistage.agent_id, depistage.campagne_id, depistage.commune_id],
    );
    return ligne?.autorise === true;
  }

  async create(dto: CreateDepistageDto, userId: number): Promise<Depistage> {
    /*
     * L'IMC vient du poids et de la taille dès que les deux sont là. Il n'est
     * repris de la saisie qu'à défaut : la mesure brute est vérifiable, un
     * IMC saisi ne l'est pas.
     */
    const imc = calculerImc(dto.poids ?? null, dto.taille ?? null) ?? dto.imc ?? null;
    const mesures = { type: dto.type, glycemie: dto.glycemie ?? null, imc };

    const resultat = dto.resultat ?? (await this.deduireResultat(mesures));

    /*
     * Le signalement hors norme et le code lisible étaient posés à l'ingestion
     * Kobo et à l'import de fichier, mais pas à la saisie manuelle : une même
     * mesure aberrante repartait signalée dans un cas et muette dans l'autre.
     */
    const motif = motifHorsNorme(
      dto.glycemie ?? null,
      imc,
      dto.poids ?? null,
      dto.taille ?? null,
    );

    const depistage = this.repository.create({
      ...dto,
      resultat,
      glycemie: dto.glycemie?.toFixed(2) ?? null,
      imc: imc?.toFixed(2) ?? null,
      poids: dto.poids?.toFixed(2) ?? null,
      taille: dto.taille?.toFixed(2) ?? null,
      code_unique:
        dto.code_unique ??
        (await genererCodeDepistage(this.repository.manager.connection, dto.date_depistage)),
      hors_norme: motif !== null,
      motif_hors_norme: motif,
      user_id: userId,
      source: DepistageSource.MANUAL,
      localisation: this.construirePoint(dto.latitude, dto.longitude),
    });

    const enregistre = await this.repository.save(depistage);
    await this.invaliderCaches();
    return enregistre;
  }

  async update(id: number, dto: UpdateDepistageDto): Promise<Depistage> {
    const depistage = await this.findOne(id);

    Object.assign(depistage, {
      ...dto,
      glycemie: dto.glycemie !== undefined ? dto.glycemie.toFixed(2) : depistage.glycemie,
      poids: dto.poids !== undefined ? dto.poids.toFixed(2) : depistage.poids,
      taille: dto.taille !== undefined ? dto.taille.toFixed(2) : depistage.taille,
    });

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      depistage.localisation = this.construirePoint(dto.latitude, dto.longitude);
    }

    /*
     * Mesures finales, après fusion : ce sont elles qui décident, pas celles
     * reçues. Corriger le seul poids doit suffire à recalculer l'IMC, le
     * résultat et le signalement.
     */
    const glycemie = numeriqueOuNull(depistage.glycemie);
    const poids = numeriqueOuNull(depistage.poids);
    const taille = numeriqueOuNull(depistage.taille);
    const imc = calculerImc(poids, taille) ?? dto.imc ?? numeriqueOuNull(depistage.imc);

    depistage.imc = imc?.toFixed(2) ?? null;

    /*
     * Le signalement était posé à la création puis jamais revu : une mesure
     * corrigée depuis le back-office restait marquée hors norme, et le
     * dépistage ne pouvait pas sortir de l'état « à vérifier ». Il est
     * maintenant recalculé à chaque modification.
     */
    const motif = motifHorsNorme(glycemie, imc, poids, taille);
    depistage.hors_norme = motif !== null;
    depistage.motif_hors_norme = motif;

    // Le résultat suit les mesures, sauf s'il est imposé explicitement.
    if (dto.resultat === undefined) {
      depistage.resultat = await this.deduireResultat({
        type: depistage.type,
        glycemie,
        imc,
      });
    }

    const enregistre = await this.repository.save(depistage);
    await this.invaliderCaches();
    return enregistre;
  }

  /** Suppression logique : la donnée reste auditable (section 3.2.3.D). */
  async softDelete(id: number): Promise<void> {
    await this.findOne(id);
    await this.repository.softDelete(id);
    await this.invaliderCaches();
  }

  async restaurer(id: number): Promise<void> {
    await this.repository.restore(id);
    await this.invaliderCaches();
  }

  async validerEnMasse(ids: number[], verifie: boolean): Promise<number> {
    if (ids.length === 0) return 0;
    const resultat = await this.repository.update({ id: In(ids) }, { verifie });
    await this.invaliderCaches();
    return resultat.affected ?? 0;
  }

  /** Requête utilisée par les exports : mêmes filtres, sans pagination. */
  async findForExport(query: QueryDepistagesDto, limite = 50000): Promise<Depistage[]> {
    const builder = this.repository
      .createQueryBuilder('depistage')
      .leftJoinAndSelect('depistage.commune', 'commune')
      .leftJoinAndSelect('depistage.campagne', 'campagne')
      .orderBy('depistage.date_depistage', 'DESC')
      .take(limite);

    this.appliquerFiltres(builder, query);
    return builder.getMany();
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Classe un dépistage à partir des seuils cliniques configurés
   * (section 3.2.7 « Seuils cliniques »).
   */
  async deduireResultat(dto: {
    type: DepistageType;
    glycemie?: number | null;
    imc?: number | null;
  }): Promise<DepistageResultat> {
    /*
     * Une mesure hors des bornes physiologiques ne décide de rien.
     *
     * Sans ce garde-fou, une glycémie de 12 mg/dL passait « Normal » — elle
     * est inférieure au seuil de 100 — alors que 12 mg/dL n'est pas une
     * glycémie humaine : c'est une erreur de saisie ou d'unité. Conclure
     * dessus, dans un sens ou dans l'autre, serait inventer un diagnostic.
     */
    if (motifHorsNorme(dto.glycemie ?? null, dto.imc ?? null) !== null) {
      return DepistageResultat.A_VERIFIER;
    }

    const seuils = await this.settings.seuilsCliniques();

    if (dto.type === DepistageType.DIABETE) {
      if (dto.glycemie == null) return DepistageResultat.AUTRE;
      if (dto.glycemie >= seuils.glycemieDiabete) return DepistageResultat.DIABETE;
      if (dto.glycemie >= seuils.glycemieNormale) return DepistageResultat.PRE_DIABETE;
      return DepistageResultat.NORMAL;
    }

    if (dto.type === DepistageType.OBESITE) {
      if (dto.imc == null) return DepistageResultat.AUTRE;
      if (dto.imc >= seuils.imcObesite) return DepistageResultat.OBESITE;
      return DepistageResultat.NORMAL;
    }

    // Endocrinopathie : pas de seuil automatisable, décision clinique.
    return DepistageResultat.AUTRE;
  }

  private appliquerFiltres(
    builder: SelectQueryBuilder<Depistage>,
    query: QueryDepistagesDto,
  ): void {
    if (query.recherche?.trim()) {
      const terme = `%${query.recherche.trim()}%`;
      builder.andWhere(
        '(depistage.nom ILIKE :terme OR depistage.prenom ILIKE :terme' +
          ' OR depistage.code_unique ILIKE :terme OR depistage.telephone ILIKE :terme)',
        { terme },
      );
    }
    if (query.communeId) {
      builder.andWhere('depistage.commune_id = :communeId', {
        communeId: query.communeId,
      });
    }
    if (query.campagneId) {
      builder.andWhere('depistage.campagne_id = :campagneId', {
        campagneId: query.campagneId,
      });
    }
    if (query.resultat) {
      builder.andWhere('depistage.resultat = :resultat', { resultat: query.resultat });
    }
    if (query.type) {
      builder.andWhere('depistage.type = :type', { type: query.type });
    }
    if (query.source) {
      builder.andWhere('depistage.source = :source', { source: query.source });
    }
    if (query.sexe) {
      builder.andWhere('depistage.sexe = :sexe', { sexe: query.sexe });
    }
    if (query.dateDebut) {
      builder.andWhere('depistage.date_depistage >= :dateDebut', {
        dateDebut: query.dateDebut,
      });
    }
    if (query.dateFin) {
      builder.andWhere('depistage.date_depistage <= :dateFin', {
        dateFin: query.dateFin,
      });
    }
    if (query.verifie !== undefined) {
      builder.andWhere('depistage.verifie = :verifie', { verifie: query.verifie });
    }
    /*
     * Seul le filtre positif a un sens : personne ne demande « montre-moi les
     * lignes qui vont bien », on cherche celles à reprendre.
     */
    if (query.horsNorme) {
      builder.andWhere('depistage.hors_norme = true');
    }
  }

  private construirePoint(
    latitude?: number,
    longitude?: number,
  ): { type: 'Point'; coordinates: [number, number] } | null {
    if (latitude == null || longitude == null) return null;
    return { type: 'Point', coordinates: [longitude, latitude] };
  }

  /** Les chiffres publics doivent refléter la base dès la prochaine requête. */
  private async invaliderCaches(): Promise<void> {
    await this.cache.invalidate('stats:');
  }
}

function numeriqueOuNull(valeur: string | null): number | null {
  if (valeur === null) return null;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : null;
}
