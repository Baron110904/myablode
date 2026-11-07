import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement } from 'src/database/entities';
import { SettingsService } from 'src/modules/settings/settings.service';
import {
  CampagneAccueilDto,
  CreateEvenementDto,
  UpdateEvenementDto,
} from './dto/evenement.dto';

/**
 * Nombre de dates que l'accueil montre de front.
 *
 * Le bandeau les range sur une rangée : au-delà de quatre, chaque cellule
 * devient trop étroite pour son titre. La borne vit ici plutôt que dans la
 * page, afin que le back-office puisse la faire respecter à la saisie au
 * lieu de laisser publier des dates qui ne s'afficheraient jamais.
 */
export const MAX_EVENEMENTS_AFFICHES = 4;

/*
 * Le libellé d'édition annoncé sur le bandeau d'accueil.
 *
 * Il était auparavant tiré de la première date publiée du programme : vidé le
 * programme, le bandeau perdait son « 6ᵉ ». Il se saisit donc, et il est
 * rangé dans `settings`, qui est fait pour cela - un réglage ne justifie ni
 * une table ni la migration qui va avec.
 */
export const CLE_EDITION = 'campagne.edition';

@Injectable()
export class EvenementsService {
  constructor(
    @InjectRepository(Evenement)
    private readonly repository: Repository<Evenement>,
    private readonly settings: SettingsService,
  ) {}

  /* ─── Campagne du bandeau d'accueil ─────────────────────────────────── */

  /** Le libellé d'édition affiché sur le bandeau d'accueil. */
  async campagne(): Promise<{ edition: string | null }> {
    const edition = await this.settings.get<string>(CLE_EDITION, '');
    return { edition: edition?.trim() ? edition : null };
  }

  async definirCampagne(dto: CampagneAccueilDto): Promise<{ edition: string | null }> {
    /*
     * `settings.value` est une colonne jsonb NOT NULL : un champ vidé ne peut
     * pas y être rangé en NULL - l'enregistrement partait en erreur 500 au
     * moment précis où l'administrateur efface le libellé. Il est donc rangé
     * en chaîne vide, et relu comme « non renseigné ».
     *
     * `definir` et non `set` : ce réglage n'existe pas au seed, il naît à la
     * première saisie, et `set` refuse une clé inconnue.
     */
    await this.settings.definir(
      CLE_EDITION,
      dto.edition?.trim() || '',
      'accueil',
      'Libellé d’édition affiché sur le bandeau d’accueil',
    );
    return this.campagne();
  }

  /**
   * Règle d'affichage public, en un seul endroit.
   *
   * Une heure de retrait renseignée fait autorité : la date reste au
   * programme jusque-là, même si elle s'est déjà tenue - elle y porte alors
   * la mention « Terminé ». C'est le cas d'une conférence dont on veut
   * garder trace jusqu'à la fin de la campagne.
   *
   * Sans heure de retrait, le comportement d'avant : la date s'efface d'elle
   * -même le lendemain, sinon l'accueil annoncerait encore en décembre une
   * conférence de novembre.
   */
  private static readonly VISIBLE = `(
    CASE WHEN evenement.date_retrait IS NOT NULL
         THEN evenement.date_retrait > NOW()
         ELSE COALESCE(evenement.date_fin, evenement.date_debut) >= CURRENT_DATE
    END
  )`;

  /** Programme affiché par le site, du plus proche au plus lointain. */
  async findPublics(limite = MAX_EVENEMENTS_AFFICHES): Promise<Evenement[]> {
    return this.repository
      .createQueryBuilder('evenement')
      .where('evenement.publie = true')
      .andWhere(EvenementsService.VISIBLE)
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
      undefined,
      dto.date_retrait,
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
      evenement.date_retrait,
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
    dateRetrait?: Date | string | null,
  ): Promise<void> {
    if (!publie) return;

    const constructeur = this.repository
      .createQueryBuilder('evenement')
      .where('evenement.publie = true')
      // Le décompte applique la règle d'affichage du site, heure de retrait
      // comprise : une date passée qu'on garde à l'écran occupe une place.
      .andWhere(EvenementsService.VISIBLE);
    if (idExclu !== undefined) {
      constructeur.andWhere('evenement.id != :idExclu', { idExclu });
    }

    const [{ visible }] = await this.repository.query<
      Array<{ visible: boolean }>
    >(
      `SELECT (CASE WHEN $3::timestamp IS NOT NULL
                    THEN $3::timestamp > NOW()
                    ELSE COALESCE($2::date, $1::date) >= CURRENT_DATE
               END) AS visible`,
      [dateDebut, dateFin ?? null, dateRetrait ?? null],
    );

    // Une date qui ne s'affichera pas ne prend aucune place.
    if (!visible) return;

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
