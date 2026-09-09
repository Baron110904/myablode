import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { assainirHtml } from 'src/modules/articles/sanitize-html';
import { PaginatedResult, PaginationDto, paginate } from 'src/common/dto/pagination.dto';
import {
  Article,
  EnvoiStatut,
  NewsletterAbonne,
  NewsletterEnvoi,
} from 'src/database/entities';
import { MailService } from 'src/modules/mail/mail.service';
import { SettingsService } from 'src/modules/settings/settings.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectRepository(NewsletterAbonne)
    private readonly abonnes: Repository<NewsletterAbonne>,
    @InjectRepository(NewsletterEnvoi)
    private readonly envois: Repository<NewsletterEnvoi>,
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Inscription depuis le site public (US-PUB-05). Réinscrire une adresse
   * désinscrite la réactive au lieu d'échouer sur la contrainte d'unicité.
   */
  /**
   * Tous les abonnés, sans pagination : destiné à l'export.
   *
   * Les désinscrits sont inclus, avec leur statut. Les retirer de l'export
   * ferait croire qu'ils n'ont jamais existé, alors qu'il faut précisément
   * savoir de ne plus les solliciter.
   */
  async tousLesAbonnes(): Promise<NewsletterAbonne[]> {
    return this.abonnes.find({ order: { created_at: 'DESC' } });
  }

  async inscrire(email: string): Promise<{ message: string }> {
    const normalise = email.toLowerCase().trim();
    const existant = await this.abonnes.findOne({ where: { email: normalise } });

    if (existant) {
      if (!existant.active) {
        existant.active = true;
        await this.abonnes.save(existant);
      }
      // Message identique dans les deux cas : l'inscription d'une adresse
      // ne doit pas être vérifiable par un tiers.
      return { message: 'Votre inscription est enregistrée.' };
    }

    await this.abonnes.save(
      this.abonnes.create({
        email: normalise,
        token: randomBytes(24).toString('hex'),
        active: true,
      }),
    );
    return { message: 'Votre inscription est enregistrée.' };
  }

  async desinscrire(token: string): Promise<{ message: string }> {
    const abonne = await this.abonnes.findOne({ where: { token } });
    if (!abonne) {
      throw new NotFoundException('Lien de désinscription invalide ou expiré.');
    }
    abonne.active = false;
    await this.abonnes.save(abonne);
    return { message: 'Vous ne recevrez plus la lettre de l’ABLODE.' };
  }

  async findAbonnes(
    pagination: PaginationDto,
    actifsSeulement = false,
  ): Promise<PaginatedResult<NewsletterAbonne>> {
    const builder = this.abonnes
      .createQueryBuilder('abonne')
      .orderBy('abonne.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    if (actifsSeulement) {
      builder.where('abonne.active = true');
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async statistiques(): Promise<{ total: number; actifs: number; desinscrits: number }> {
    const total = await this.abonnes.count();
    const actifs = await this.abonnes.count({ where: { active: true } });
    return { total, actifs, desinscrits: total - actifs };
  }

  async supprimerAbonne(id: number): Promise<void> {
    const abonne = await this.abonnes.findOne({ where: { id } });
    if (!abonne) throw new NotFoundException(`Abonné ${id} introuvable.`);
    await this.abonnes.remove(abonne);
  }

  async findEnvois(pagination: PaginationDto): Promise<PaginatedResult<NewsletterEnvoi>> {
    const [items, total] = await this.envois.findAndCount({
      relations: { article: true },
      order: { created_at: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(items, total, pagination);
  }

  /**
   * Envoie une lettre à tous les abonnés actifs.
   *
   * Les emails partent par lots de 20 avec une pause : un envoi en rafale
   * ferait dépasser la limite journalière des offres SMTP gratuites citées
   * dans les contraintes budgétaires (section 6.1).
   */
  async envoyer(options: {
    sujet: string;
    contenu?: string;
    articleId?: number;
  }): Promise<NewsletterEnvoi> {
    let contenu = options.contenu;
    let article: Article | null = null;

    if (options.articleId) {
      article = await this.articles.findOne({ where: { id: options.articleId } });
      if (!article) {
        throw new NotFoundException(`Article ${options.articleId} introuvable.`);
      }
      contenu = contenu ?? this.gabaritDepuisArticle(article);
    }

    /*
     * Assainissement côté serveur. L'éditeur du back-office nettoie déjà sa
     * sortie, mais un nettoyage côté navigateur n'est pas un contrôle de
     * sécurité : l'API accepte n'importe quel HTML, et ce corps part vers
     * tous les abonnés. Même filtre que les articles.
     */
    if (contenu?.trim()) {
      contenu = assainirHtml(contenu);
    }

    if (!contenu?.trim()) {
      throw new BadRequestException(
        'Fournissez un contenu ou sélectionnez un article à diffuser.',
      );
    }

    const signature = await this.settings.get<string>('newsletter_signature', '');
    const corps = signature
      ? `${contenu}<p style="margin-top:24px;color:#64748b;font-size:12px">${signature}</p>`
      : contenu;

    const destinataires = await this.abonnes.find({ where: { active: true } });
    const envoi = await this.envois.save(
      this.envois.create({
        article_id: article?.id ?? null,
        sujet: options.sujet,
        contenu: corps,
        statut: EnvoiStatut.PLANIFIE,
        nb_destinataires: destinataires.length,
      }),
    );

    let reussis = 0;
    for (let i = 0; i < destinataires.length; i += 20) {
      const lot = destinataires.slice(i, i + 20);
      const resultats = await Promise.all(
        lot.map((abonne) =>
          this.mail.envoyerNewsletter(abonne.email, options.sujet, corps, abonne.token),
        ),
      );
      reussis += resultats.filter(Boolean).length;
      if (i + 20 < destinataires.length) {
        await pause(1000);
      }
    }

    envoi.statut = reussis > 0 ? EnvoiStatut.ENVOYE : EnvoiStatut.ECHEC;
    envoi.date_envoi = new Date();
    envoi.nb_destinataires = reussis;

    if (reussis === 0 && destinataires.length > 0) {
      this.logger.warn(
        `Newsletter « ${options.sujet} » : aucun email envoyé. Vérifiez la configuration SMTP.`,
      );
    }

    return this.envois.save(envoi);
  }

  private gabaritDepuisArticle(article: Article): string {
    return `
      <h2 style="margin:0 0 12px;font-size:20px">${echapper(article.titre)}</h2>
      ${article.extrait ? `<p>${echapper(article.extrait)}</p>` : ''}
      ${article.contenu}
    `;
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
