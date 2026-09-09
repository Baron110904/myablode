import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
  paginate,
} from 'src/common/dto/pagination.dto';
import { FormulaireMarche, InscriptionMarche } from 'src/database/entities';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import {
  ConfigurerFormulaireDto,
  CreerInscriptionDto,
  QueryInscriptionsDto,
} from './dto/marche.dto';

/** Vue publique du formulaire : ce que le site vitrine a le droit de savoir. */
export interface FormulairePublic {
  id: number;
  titre: string;
  introduction: string | null;
  dateFermeture: string | null;
  messageFerme: string | null;
  /** Faux dès que la date de fermeture est passée. */
  ouvert: boolean;
  /** Nombre d'inscrits, pour donner l'élan sans nommer personne. */
  inscrits: number;
}

@Injectable()
export class MarcheService {
  private readonly logger = new Logger(MarcheService.name);

  constructor(
    @InjectRepository(FormulaireMarche)
    private readonly formulaires: Repository<FormulaireMarche>,
    @InjectRepository(InscriptionMarche)
    private readonly inscriptions: Repository<InscriptionMarche>,
    private readonly newsletter: NewsletterService,
  ) {}

  /* ─── Configuration ────────────────────────────────────────────────── */

  /**
   * Crée ou met à jour le formulaire d'un article.
   *
   * Un seul formulaire par article : reconfigurer remplace, ce qui évite
   * qu'une deuxième saisie fasse apparaître deux formulaires sur la page.
   */
  async configurer(
    articleId: number,
    dto: ConfigurerFormulaireDto,
  ): Promise<FormulaireMarche> {
    const existant = await this.formulaires.findOne({
      where: { article_id: articleId },
    });

    const formulaire = existant ?? this.formulaires.create({ article_id: articleId });

    formulaire.titre = dto.titre.trim();
    formulaire.introduction = dto.introduction?.trim() || null;
    formulaire.message_ferme = dto.message_ferme?.trim() || null;
    formulaire.date_fermeture = dto.date_fermeture ? new Date(dto.date_fermeture) : null;
    formulaire.publie = dto.publie ?? false;

    return this.formulaires.save(formulaire);
  }

  async parArticle(articleId: number): Promise<FormulaireMarche | null> {
    return this.formulaires.findOne({ where: { article_id: articleId } });
  }

  async supprimer(articleId: number): Promise<{ message: string }> {
    const formulaire = await this.parArticle(articleId);
    if (!formulaire) throw new NotFoundException('Aucun formulaire sur cet article.');
    await this.formulaires.remove(formulaire);
    return { message: 'Formulaire retiré de l’article.' };
  }

  /* ─── Vue publique ─────────────────────────────────────────────────── */

  /**
   * Formulaire tel que le site vitrine le voit.
   *
   * Un formulaire non publié n'existe pas pour le public : `null`, et la page
   * n'affiche rien. Un formulaire publié mais fermé reste visible — il faut
   * dire aux gens que c'est terminé, pas faire disparaître l'information.
   */
  async vuePublique(articleId: number): Promise<FormulairePublic | null> {
    const formulaire = await this.parArticle(articleId);
    if (!formulaire || !formulaire.publie) return null;

    const inscrits = await this.inscriptions.count({
      where: { formulaire_id: formulaire.id },
    });

    return {
      id: formulaire.id,
      titre: formulaire.titre,
      introduction: formulaire.introduction,
      dateFermeture: formulaire.date_fermeture?.toISOString() ?? null,
      messageFerme: formulaire.message_ferme,
      ouvert: this.estOuvert(formulaire),
      inscrits,
    };
  }

  /**
   * Le formulaire accepte-t-il encore des inscriptions ?
   *
   * Sans date de fermeture, il reste ouvert : c'est la dépublication qui le
   * ferme. La comparaison se fait sur l'instant, pas sur le jour — une
   * fermeture « le 12 à 18 h » doit valoir à 18 h, pas à minuit.
   */
  private estOuvert(formulaire: FormulaireMarche): boolean {
    if (!formulaire.publie) return false;
    if (!formulaire.date_fermeture) return true;
    return formulaire.date_fermeture.getTime() > Date.now();
  }

  /* ─── Inscriptions ─────────────────────────────────────────────────── */

  async inscrire(dto: CreerInscriptionDto): Promise<{ message: string }> {
    const formulaire = await this.formulaires.findOne({
      where: { id: dto.formulaire_id },
    });
    if (!formulaire) throw new NotFoundException('Formulaire introuvable.');

    /*
     * La fermeture est revérifiée ici et non seulement à l'affichage : une
     * page ouverte avant l'échéance et soumise après passerait sinon.
     */
    if (!this.estOuvert(formulaire)) {
      throw new ConflictException(
        formulaire.message_ferme?.trim() ||
          'Les inscriptions à la marche sont closes.',
      );
    }

    try {
      await this.inscriptions.save(
        this.inscriptions.create({
          formulaire_id: formulaire.id,
          nom: dto.nom.trim(),
          prenom: dto.prenom.trim(),
          age: dto.age,
          sexe: dto.sexe,
          fonction: dto.fonction.trim(),
          ville: dto.ville.trim(),
          quartier: dto.quartier.trim(),
          email: dto.email.trim().toLowerCase(),
          telephone: dto.telephone.trim(),
          deja_participe: dto.deja_participe ?? false,
          motivation: dto.motivation?.trim() || null,
        }),
      );
    } catch (erreur) {
      /*
       * L'index unique porte sur (formulaire, nom, prénom) sans accents ni
       * casse. Le message reste neutre : confirmer qu'une personne est déjà
       * inscrite renseignerait un tiers sur sa participation.
       */
      if (erreur instanceof QueryFailedError && String(erreur.message).includes('UQ_inscription_personne')) {
        throw new ConflictException(
          'Une inscription existe déjà à ce nom. Contactez-nous si c’est une erreur.',
        );
      }
      throw erreur;
    }

    /*
     * Abonnement à la lettre d'information.
     *
     * Après l'enregistrement et hors de sa transaction : une lettre
     * d'information indisponible ne doit pas faire perdre une inscription à
     * la marche. L'échec est journalisé, pas remonté au participant — il n'y
     * peut rien et son inscription, elle, est bien prise.
     *
     * Le formulaire annonce cet abonnement, et chaque envoi porte un lien de
     * désinscription : personne n'y entre à son insu.
     */
    try {
      await this.newsletter.inscrire(dto.email);
    } catch (erreur) {
      this.logger.warn(
        `Inscription marche enregistrée, abonnement à la lettre échoué pour ` +
          `${dto.email} : ${(erreur as Error).message}`,
      );
    }

    return {
      message:
        'Votre inscription à la marche est enregistrée. À très bientôt sur le parcours !',
    };
  }

  async listerInscriptions(
    query: QueryInscriptionsDto,
  ): Promise<PaginatedResult<InscriptionMarche>> {
    const builder = this.inscriptions
      .createQueryBuilder('inscription')
      .leftJoin('inscription.formulaire', 'formulaire')
      .addSelect(['formulaire.id', 'formulaire.titre'])
      .skip(query.skip)
      .take(query.limit)
      .orderBy('inscription.created_at', 'DESC');

    if (query.formulaireId) {
      builder.andWhere('inscription.formulaire_id = :id', { id: query.formulaireId });
    }
    if (query.traite !== undefined) {
      builder.andWhere('inscription.traite = :traite', { traite: query.traite });
    }
    if (query.recherche?.trim()) {
      const terme = `%${query.recherche.trim()}%`;
      builder.andWhere(
        `(unaccent_lower(inscription.nom) LIKE unaccent_lower(:terme)
          OR unaccent_lower(inscription.prenom) LIKE unaccent_lower(:terme)
          OR unaccent_lower(inscription.ville) LIKE unaccent_lower(:terme))`,
        { terme },
      );
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  async marquer(id: number, traite: boolean): Promise<InscriptionMarche> {
    const inscription = await this.inscriptions.findOne({ where: { id } });
    if (!inscription) throw new NotFoundException(`Inscription ${id} introuvable.`);
    inscription.traite = traite;
    return this.inscriptions.save(inscription);
  }

  /** Compteur affiché en pastille dans la navigation admin. */
  async nonTraitees(): Promise<number> {
    return this.inscriptions.count({ where: { traite: false } });
  }

  /** Répartition affichée en tête de la liste, pour préparer la marche. */
  async statistiques(formulaireId?: number): Promise<{
    total: number;
    hommes: number;
    femmes: number;
    ancienParticipants: number;
    ageMoyen: number | null;
  }> {
    const builder = this.inscriptions.createQueryBuilder('i');
    if (formulaireId) {
      builder.where('i.formulaire_id = :id', { id: formulaireId });
    }

    const ligne = await builder
      .select('COUNT(*)::int', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE i.sexe = 'M')::int`, 'hommes')
      .addSelect(`COUNT(*) FILTER (WHERE i.sexe = 'F')::int`, 'femmes')
      .addSelect(
        'COUNT(*) FILTER (WHERE i.deja_participe)::int',
        'ancienParticipants',
      )
      .addSelect('ROUND(AVG(i.age))::int', 'ageMoyen')
      .getRawOne<{
        total: number;
        hommes: number;
        femmes: number;
        ancienParticipants: number;
        ageMoyen: number | null;
      }>();

    return {
      total: ligne?.total ?? 0,
      hommes: ligne?.hommes ?? 0,
      femmes: ligne?.femmes ?? 0,
      ancienParticipants: ligne?.ancienParticipants ?? 0,
      ageMoyen: ligne?.ageMoyen ?? null,
    };
  }
}
