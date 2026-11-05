import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement } from 'src/database/entities';
import { CreateEvenementDto, UpdateEvenementDto } from './dto/evenement.dto';

/**
 * Nombre de dates que l'accueil montre de front.
 *
 * Le bandeau les range sur une rangée : au-delà de quatre, chaque cellule
 * devient trop étroite pour son titre. La borne vit ici plutôt que dans la
 * page, afin que le back-office puisse la faire respecter à la saisie au
 * lieu de laisser publier des dates qui ne s'afficheraient jamais.
 */
export const MAX_EVENEMENTS_AFFICHES = 4;

@Injectable()
export class EvenementsService {
  constructor(
    @InjectRepository(Evenement)
    private readonly repository: Repository<Evenement>,
  ) {}

  /**
   * Programme affiché par le site : les dates publiées qui ne sont pas encore
   * passées, du plus proche au plus lointain.
   *
   * Un événement terminé disparaît de lui-même du bandeau le lendemain. Sans
   * cette borne, l'accueil annoncerait encore en décembre une conférence de
   * novembre, et il faudrait une tâche de ménage pour l'en retirer.
   */
  async findPublics(limite = MAX_EVENEMENTS_AFFICHES): Promise<Evenement[]> {
    return this.repository
      .createQueryBuilder('evenement')
      .where('evenement.publie = true')
      .andWhere('COALESCE(evenement.date_fin, evenement.date_debut) >= CURRENT_DATE')
      .orderBy('evenement.date_debut', 'ASC')
      .take(limite)
      .getMany();
  }

  /** Vue back-office : les dates passées restent visibles et modifiables. */
  async findAll(): Promise<Evenement[]> {
    return this.repository.find({ order: { date_debut: 'DESC' } });
  }

  async findOne(id: number): Promise<Evenement> {
    const evenement = await this.repository.findOne({ where: { id } });
    if (!evenement) throw new NotFoundException(`Événement ${id} introuvable.`);
    return evenement;
  }

  async create(dto: CreateEvenementDto): Promise<Evenement> {
    this.verifierOrdreDesDates(dto.date_debut, dto.date_fin);
    // `publie` vaut vrai par défaut dans l'entité : une création sans
    // mention explicite compte donc comme une publication.
    await this.verifierPlafondAffichage(
      dto.publie !== false,
      dto.date_debut,
      dto.date_fin,
    );
    return this.repository.save(this.repository.create(dto));
  }

  async update(id: number, dto: UpdateEvenementDto): Promise<Evenement> {
    const evenement = await this.findOne(id);
    Object.assign(evenement, dto);
    this.verifierOrdreDesDates(evenement.date_debut, evenement.date_fin);
    // L'événement modifié est exclu du décompte : se republier soi-même ne
    // doit pas compter pour une place supplémentaire.
    await this.verifierPlafondAffichage(
      evenement.publie,
      evenement.date_debut,
      evenement.date_fin,
      id,
    );
    return this.repository.save(evenement);
  }

  async remove(id: number): Promise<void> {
    const evenement = await this.findOne(id);
    await this.repository.remove(evenement);
  }

  /**
   * Refuse la cinquième date affichable.
   *
   * Seules comptent les dates publiées et non passées, c'est-à-dire celles
   * que l'accueil montre vraiment : un programme de dix ans d'archives
   * publiées ne doit pas bloquer la saisie de la prochaine conférence.
   * Le jour de référence est demandé à la base, pour que la bordure soit
   * la même ici et dans `findPublics`.
   */
  private async verifierPlafondAffichage(
    publie: boolean,
    dateDebut: string,
    dateFin?: string | null,
    idExclu?: number,
  ): Promise<void> {
    if (!publie) return;

    const constructeur = this.repository
      .createQueryBuilder('evenement')
      .where('evenement.publie = true')
      .andWhere(
        'COALESCE(evenement.date_fin, evenement.date_debut) >= CURRENT_DATE',
      );
    if (idExclu !== undefined) {
      constructeur.andWhere('evenement.id != :idExclu', { idExclu });
    }

    const [{ a_venir: aVenir }] = await this.repository.query<
      Array<{ a_venir: boolean }>
    >('SELECT (COALESCE($2::date, $1::date) >= CURRENT_DATE) AS a_venir', [
      dateDebut,
      dateFin ?? null,
    ]);

    // Une date déjà passée ne prend aucune place : elle ne s'affiche pas.
    if (!aVenir) return;

    if ((await constructeur.getCount()) >= MAX_EVENEMENTS_AFFICHES) {
      throw new BadRequestException(
        `L’accueil n’affiche que ${MAX_EVENEMENTS_AFFICHES} dates à la fois. ` +
          'Dépubliez une date à venir avant de publier celle-ci, ou ' +
          'enregistrez-la sans la publier.',
      );
    }
  }

  /**
   * La base porte la même règle, mais elle répondrait par une erreur SQL
   * opaque. Le message doit venir d'ici pour arriver lisible au formulaire.
   */
  private verifierOrdreDesDates(debut: string, fin?: string | null): void {
    if (fin && fin < debut) {
      throw new BadRequestException(
        'La date de fin ne peut pas précéder la date de début.',
      );
    }
  }
}
