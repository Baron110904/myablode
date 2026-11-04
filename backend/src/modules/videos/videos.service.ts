import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from 'src/common/dto/pagination.dto';
import { Video, VideoStatut } from 'src/database/entities';
import { CreateVideoDto, QueryVideosDto, UpdateVideoDto } from './dto/video.dto';
import { dossierVideos, urlPublique } from './stockage';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectRepository(Video)
    private readonly repository: Repository<Video>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Vidéos visibles du site : publiées et dont la date est atteinte. Même
   * règle que les articles, pour que « publier le 14 » veuille dire la même
   * chose dans les deux rubriques.
   */
  async findPubliees(limite = 12): Promise<Video[]> {
    return this.repository
      .createQueryBuilder('video')
      .where('video.statut = :statut', { statut: VideoStatut.PUBLISHED })
      .andWhere('(video.date_publication IS NULL OR video.date_publication <= now())')
      // La mise en avant passe devant, le reste se range du plus récent au plus ancien.
      .orderBy('video.a_la_une', 'DESC')
      .addOrderBy('video.date_publication', 'DESC')
      .addOrderBy('video.id', 'DESC')
      .take(limite)
      .getMany();
  }

  /** Vue back-office : brouillons compris. */
  async findAll(query: QueryVideosDto): Promise<PaginatedResult<Video>> {
    const builder = this.repository
      .createQueryBuilder('video')
      .orderBy('video.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit);

    if (query.statut) {
      builder.andWhere('video.statut = :statut', { statut: query.statut });
    }
    if (query.categorie) {
      builder.andWhere('video.categorie = :categorie', { categorie: query.categorie });
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: number): Promise<Video> {
    const video = await this.repository.findOne({ where: { id } });
    if (!video) throw new NotFoundException(`Vidéo ${id} introuvable.`);
    return video;
  }

  /**
   * Enregistre la fiche d'un fichier déjà écrit sur le disque par Multer.
   *
   * `fichier_url` est construite ici, à partir du nom tiré au sort, et non
   * reprise d'un champ du formulaire : l'adresse de lecture reste une
   * décision du serveur.
   */
  async create(dto: CreateVideoDto, fichier: Express.Multer.File): Promise<Video> {
    const video = this.repository.create({
      ...dto,
      fichier_nom: fichier.filename,
      fichier_url: urlPublique(fichier.filename),
      taille: String(fichier.size),
      mime: fichier.mimetype,
      date_publication: this.resoudreDatePublication(dto),
      a_la_une: dto.a_la_une ?? false,
    });

    const enregistree = await this.repository.save(video);
    if (enregistree.a_la_une) await this.retirerAutresUnes(enregistree.id);
    return enregistree;
  }

  async update(id: number, dto: UpdateVideoDto): Promise<Video> {
    const video = await this.findOne(id);

    const { date_publication, ...reste } = dto;
    Object.assign(video, reste);

    if (date_publication !== undefined) {
      video.date_publication = date_publication ? new Date(date_publication) : null;
    } else if (dto.statut === VideoStatut.PUBLISHED && !video.date_publication) {
      video.date_publication = new Date();
    }

    const enregistree = await this.repository.save(video);
    if (enregistree.a_la_une) await this.retirerAutresUnes(enregistree.id);
    return enregistree;
  }

  /**
   * Supprime la fiche puis le fichier.
   *
   * Dans cet ordre : si l'effacement du fichier échoue, il reste un orphelin
   * sur le disque, ce qui coûte de la place. L'ordre inverse laisserait une
   * fiche pointant vers un fichier absent, ce qui casse la page publique.
   */
  async remove(id: number): Promise<void> {
    const video = await this.findOne(id);
    await this.repository.remove(video);

    const chemin = join(dossierVideos(this.config), video.fichier_nom);
    try {
      await unlink(chemin);
    } catch (erreur) {
      const code = (erreur as NodeJS.ErrnoException).code;
      // Fichier déjà absent : le but est atteint, rien à signaler.
      if (code !== 'ENOENT') {
        this.logger.warn(`Fichier ${video.fichier_nom} non supprimé : ${code}`);
      }
    }
  }

  /** Une seule vidéo occupe le grand lecteur de la page Actualités. */
  private async retirerAutresUnes(idConserve: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Video)
      .set({ a_la_une: false })
      .where('id != :id', { id: idConserve })
      .andWhere('a_la_une = true')
      .execute();
  }

  private resoudreDatePublication(dto: CreateVideoDto): Date | null {
    if (dto.date_publication) return new Date(dto.date_publication);
    if (dto.statut === VideoStatut.PUBLISHED) return new Date();
    return null;
  }
}
