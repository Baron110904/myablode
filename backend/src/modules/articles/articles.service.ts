import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from 'src/common/dto/pagination.dto';
import { slugifier } from 'src/common/normalisation';
import { Article, ArticleStatut } from 'src/database/entities';
import {
  CreateArticleDto,
  QueryArticlesDto,
  UpdateArticleDto,
} from './dto/article.dto';
import { assainirHtml } from './sanitize-html';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly repository: Repository<Article>,
  ) {}

  /**
   * Articles visibles du site vitrine : publiés et dont la date de
   * publication est atteinte (la publication programmée devient donc
   * effective sans tâche planifiée).
   */
  async findPublies(query: QueryArticlesDto): Promise<PaginatedResult<Article>> {
    const builder = this.repository
      .createQueryBuilder('article')
      .where('article.statut = :statut', { statut: ArticleStatut.PUBLISHED })
      .andWhere(
        '(article.date_publication IS NULL OR article.date_publication <= now())',
      )
      .andWhere('(article.date_retrait IS NULL OR article.date_retrait > now())')
      /*
       * Les articles à la une passent devant, les autres restent du plus
       * récent au plus ancien. Trier ainsi plutôt que laisser la page
       * chercher l'article mis en avant garantit qu'il se trouve sur la
       * première page : coché sur une parution de mars, il serait sinon
       * invisible dès que douze articles l'auraient suivi.
       */
      .orderBy('article.a_la_une', 'DESC')
      .addOrderBy('article.date_publication', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    if (query.categorie) {
      builder.andWhere('article.categorie = :categorie', {
        categorie: query.categorie,
      });
    }
    if (query.langue) {
      builder.andWhere('article.langue = :langue', { langue: query.langue });
    }
    if (query.recherche?.trim()) {
      builder.andWhere(
        `to_tsvector('french', coalesce(article.titre, '') || ' ' || coalesce(article.contenu, ''))
         @@ plainto_tsquery('french', :recherche)`,
        { recherche: query.recherche.trim() },
      );
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  /** Vue admin : inclut brouillons et archives. */
  async findAll(query: QueryArticlesDto): Promise<PaginatedResult<Article>> {
    const builder = this.repository
      .createQueryBuilder('article')
      .orderBy('article.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    if (query.statut) {
      builder.andWhere('article.statut = :statut', { statut: query.statut });
    }
    if (query.categorie) {
      builder.andWhere('article.categorie = :categorie', {
        categorie: query.categorie,
      });
    }
    if (query.recherche?.trim()) {
      builder.andWhere('article.titre ILIKE :terme', {
        terme: `%${query.recherche.trim()}%`,
      });
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  async findRecents(limite = 3): Promise<Article[]> {
    return this.repository
      .createQueryBuilder('article')
      .where('article.statut = :statut', { statut: ArticleStatut.PUBLISHED })
      .andWhere(
        '(article.date_publication IS NULL OR article.date_publication <= now())',
      )
      .andWhere('(article.date_retrait IS NULL OR article.date_retrait > now())')
      .orderBy('article.date_publication', 'DESC')
      .take(limite)
      .getMany();
  }

  async findBySlug(slug: string): Promise<Article> {
    const article = await this.repository.findOne({
      where: { slug },
      relations: { images: true },
    });
    if (!article) {
      throw new NotFoundException(`Article « ${slug} » introuvable.`);
    }
    return article;
  }

  /** Version publique : un brouillon ne doit pas fuiter via son URL. */
  async findBySlugPublic(slug: string): Promise<Article> {
    const article = await this.findBySlug(slug);
    const maintenant = new Date();
    const publie =
      article.statut === ArticleStatut.PUBLISHED &&
      (!article.date_publication || article.date_publication <= maintenant) &&
      /*
       * Un article retiré répond 404 et non une page vide : son adresse
       * circule encore dans les courriels et les partages, et il vaut mieux
       * dire « cela n'existe plus » que servir une coquille.
       */
      (!article.date_retrait || article.date_retrait > maintenant);
    if (!publie) {
      throw new NotFoundException(`Article « ${slug} » introuvable.`);
    }
    return article;
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.repository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!article) {
      throw new NotFoundException(`Article ${id} introuvable.`);
    }
    return article;
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const slug = await this.slugUnique(dto.slug ?? dto.titre);
    const article = this.repository.create({
      ...dto,
      slug,
      // Le HTML de l'éditeur est assaini avant stockage (défense XSS, A03).
      contenu: assainirHtml(dto.contenu),
      extrait: dto.extrait ?? this.extraireResume(dto.contenu),
      date_publication: this.resoudreDatePublication(dto),
      date_retrait: dto.date_retrait ? new Date(dto.date_retrait) : null,
    });
    return this.repository.save(article);
  }

  async update(id: number, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);

    if (dto.slug && dto.slug !== article.slug) {
      article.slug = await this.slugUnique(dto.slug, id);
    }
    if (dto.contenu !== undefined) {
      article.contenu = assainirHtml(dto.contenu);
      if (!dto.extrait && !article.extrait) {
        article.extrait = this.extraireResume(dto.contenu);
      }
    }

    const { slug, contenu, date_publication, date_retrait, ...reste } = dto;
    Object.assign(article, reste);

    /*
     * `undefined` signifie « champ non transmis », `null` « champ vidé ».
     * Les distinguer permet d'effacer une échéance depuis le back-office :
     * confondues, la date restait inscrite quoi qu'on fasse.
     */
    if (date_retrait !== undefined) {
      article.date_retrait = date_retrait ? new Date(date_retrait) : null;
    }

    if (date_publication !== undefined) {
      article.date_publication = date_publication ? new Date(date_publication) : null;
    } else if (
      dto.statut === ArticleStatut.PUBLISHED &&
      !article.date_publication
    ) {
      article.date_publication = new Date();
    }

    return this.repository.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.repository.remove(article);
  }

  async categoriesAvecCompte(): Promise<Array<{ categorie: string; total: number }>> {
    return this.repository.query(
      `SELECT categorie, COUNT(*)::int AS total
       FROM articles
       WHERE statut = 'published'
         AND (date_publication IS NULL OR date_publication <= now())
         AND (date_retrait IS NULL OR date_retrait > now())
       GROUP BY categorie ORDER BY total DESC`,
    );
  }

  private resoudreDatePublication(dto: CreateArticleDto): Date | null {
    if (dto.date_publication) return new Date(dto.date_publication);
    if (dto.statut === ArticleStatut.PUBLISHED) return new Date();
    return null;
  }

  /** Résumé de repli : 240 caractères de texte, balises retirées. */
  private extraireResume(html: string): string {
    const texte = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return texte.length > 240 ? `${texte.slice(0, 237)}…` : texte;
  }

  /** Ajoute un suffixe numérique tant que le slug est déjà pris. */
  private async slugUnique(source: string, idExclu?: number): Promise<string> {
    const base = slugifier(source);
    if (!base) {
      throw new BadRequestException('Le titre ne permet pas de générer une adresse.');
    }

    let candidat = base;
    let suffixe = 2;
    // 50 tentatives : au-delà, c'est un problème de données, pas de collision.
    while (suffixe < 50) {
      const existant = await this.repository.findOne({ where: { slug: candidat } });
      if (!existant || existant.id === idExclu) return candidat;
      candidat = `${base}-${suffixe}`;
      suffixe += 1;
    }
    return `${base}-${Date.now()}`;
  }
}

