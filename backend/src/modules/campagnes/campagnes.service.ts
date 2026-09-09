import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from 'src/common/dto/pagination.dto';
import { Campagne, CampagneStatut } from 'src/database/entities';
import {
  CreateCampagneDto,
  QueryCampagnesDto,
  UpdateCampagneDto,
} from './dto/campagne.dto';

@Injectable()
export class CampagnesService {
  constructor(
    @InjectRepository(Campagne)
    private readonly repository: Repository<Campagne>,
  ) {}

  async findAll(query: QueryCampagnesDto): Promise<PaginatedResult<Campagne>> {
    const builder = this.repository
      .createQueryBuilder('campagne')
      .leftJoinAndSelect('campagne.commune', 'commune')
      .orderBy('campagne.date_debut', query.order)
      .skip(query.skip)
      .take(query.limit);

    if (!query.inclureArchivees) {
      builder.andWhere('campagne.archivee = false');
    }
    if (query.statut) {
      builder.andWhere('campagne.statut = :statut', { statut: query.statut });
    }
    if (query.communeId) {
      builder.andWhere('campagne.commune_id = :communeId', {
        communeId: query.communeId,
      });
    }
    if (query.recherche?.trim()) {
      builder.andWhere(
        '(campagne.nom ILIKE :recherche OR campagne.responsable ILIKE :recherche)',
        { recherche: `%${query.recherche.trim()}%` },
      );
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: number): Promise<Campagne> {
    const campagne = await this.repository.findOne({
      where: { id },
      relations: { commune: true },
    });
    if (!campagne) {
      throw new NotFoundException(`Campagne ${id} introuvable.`);
    }
    return campagne;
  }

  /** Campagnes à venir, pour le widget « Prochaines campagnes ». */
  async prochaines(limite = 4): Promise<Campagne[]> {
    return this.repository
      .createQueryBuilder('campagne')
      .leftJoinAndSelect('campagne.commune', 'commune')
      .where('campagne.archivee = false')
      .andWhere('campagne.statut IN (:...statuts)', {
        statuts: [CampagneStatut.PLANIFIEE, CampagneStatut.EN_COURS],
      })
      .andWhere('campagne.date_debut >= CURRENT_DATE - INTERVAL \'7 days\'')
      .orderBy('campagne.date_debut', 'ASC')
      .take(limite)
      .getMany();
  }

  /** Campagne actuellement sur le terrain (bandeau de la page d'accueil). */
  async enCours(): Promise<Campagne | null> {
    return this.repository
      .createQueryBuilder('campagne')
      .leftJoinAndSelect('campagne.commune', 'commune')
      .where('campagne.archivee = false')
      .andWhere('campagne.statut = :statut', { statut: CampagneStatut.EN_COURS })
      .orderBy('campagne.date_debut', 'DESC')
      .getOne();
  }

  async create(dto: CreateCampagneDto): Promise<Campagne> {
    this.verifierCoherenceDates(dto.date_debut, dto.date_fin);
    const campagne = this.repository.create({
      ...dto,
      statut: dto.statut ?? CampagneStatut.PLANIFIEE,
    });
    return this.repository.save(campagne);
  }

  async update(id: number, dto: UpdateCampagneDto): Promise<Campagne> {
    const campagne = await this.findOne(id);
    this.verifierCoherenceDates(
      dto.date_debut ?? campagne.date_debut,
      dto.date_fin ?? campagne.date_fin ?? undefined,
    );
    Object.assign(campagne, dto);
    return this.repository.save(campagne);
  }

  async remove(id: number): Promise<void> {
    const campagne = await this.findOne(id);
    await this.repository.remove(campagne);
  }

  async archiver(id: number): Promise<Campagne> {
    const campagne = await this.findOne(id);
    campagne.archivee = true;
    campagne.statut = CampagneStatut.CLOTUREE;
    return this.repository.save(campagne);
  }

  /** Chiffres d'une campagne, pour sa fiche et son rapport PDF. */
  async statistiques(id: number): Promise<{
    campagne: Campagne;
    depistages: number;
    cas: number;
    taux: number;
    parResultat: Array<{ resultat: string; total: number }>;
    parSexe: Array<{ sexe: string; total: number }>;
    orientes: number;
    ageMoyen: number | null;
    types: string[];
    sources: string[];
  }> {
    const campagne = await this.findOne(id);
    const [ligne] = await this.repository.query(
      `SELECT
         COUNT(*)::int AS depistages,
         COUNT(*) FILTER (WHERE resultat IN ('diabete','obesite','autre'))::int AS cas,
         COUNT(*) FILTER (WHERE oriente_centre)::int AS orientes,
         ROUND(AVG(
           EXTRACT(YEAR FROM age(date_depistage, date_naissance))
         )::numeric, 1)::float AS age_moyen
       FROM depistages WHERE campagne_id = $1 AND deleted_at IS NULL`,
      [id],
    );
    const parResultat = await this.repository.query(
      `SELECT resultat, COUNT(*)::int AS total
       FROM depistages WHERE campagne_id = $1 AND deleted_at IS NULL
       GROUP BY resultat ORDER BY total DESC`,
      [id],
    );
    const parSexe = await this.repository.query(
      `SELECT sexe, COUNT(*)::int AS total
       FROM depistages WHERE campagne_id = $1 AND deleted_at IS NULL
       GROUP BY sexe`,
      [id],
    );

    // Le rapport indique les types réellement dépistés et l'origine des
    // données plutôt que des valeurs saisies à la main.
    const inventaire = await this.repository.query(
      `SELECT
         ARRAY_AGG(DISTINCT type) AS types,
         ARRAY_AGG(DISTINCT source) AS sources
       FROM depistages WHERE campagne_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    return {
      campagne,
      depistages: ligne.depistages,
      cas: ligne.cas,
      orientes: ligne.orientes,
      taux:
        ligne.depistages > 0
          ? Math.round((ligne.cas / ligne.depistages) * 1000) / 10
          : 0,
      parResultat,
      parSexe,
      ageMoyen: ligne.age_moyen ?? null,
      types: inventaire[0]?.types ?? [],
      sources: inventaire[0]?.sources ?? [],
    };
  }

  private verifierCoherenceDates(debut: string, fin?: string | null): void {
    if (fin && new Date(fin) < new Date(debut)) {
      throw new BadRequestException(
        'La date de fin ne peut pas précéder la date de début.',
      );
    }
  }
}
