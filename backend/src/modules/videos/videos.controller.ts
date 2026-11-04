import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateVideoDto, QueryVideosDto, UpdateVideoDto } from './dto/video.dto';
import { NettoyageFichierInterceptor } from './nettoyage-fichier.interceptor';
import { LIBELLE_FORMATS } from './stockage';
import { VideosService } from './videos.service';
import { ThrottleLecture } from 'src/common/throttle-lecture';

@ApiTags('Vidéos')
@ThrottleLecture()
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videos: VideosService,
    private readonly audit: AuditService,
  ) {}

  // ─── Site vitrine ────────────────────────────────────────────────────────

  @Public()
  @Get('publiees')
  @ApiOperation({ summary: 'Vidéos publiées (section « Nos actions en vidéo »)' })
  publiees() {
    return this.videos.findPubliees(12);
  }

  // ─── Back-office ─────────────────────────────────────────────────────────

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Toutes les vidéos, brouillons compris' })
  findAll(@Query() query: QueryVideosDto) {
    return this.videos.findAll(query);
  }

  /**
   * Dépôt d'une vidéo.
   *
   * L'ordre des intercepteurs compte : le nettoyage doit envelopper le
   * téléversement pour voir passer l'erreur et retrouver `request.file`.
   */
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(NettoyageFichierInterceptor, FileInterceptor('file'))
  @ApiOperation({ summary: 'Téléverse une vidéo et crée sa fiche' })
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateVideoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException(
        `Aucun fichier reçu. Déposez une vidéo au format ${LIBELLE_FORMATS}.`,
      );
    }

    const video = await this.videos.create(dto, file);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'video',
      entityId: video.id,
      metadata: { titre: video.titre, taille: video.taille, statut: video.statut },
      request,
    });
    return video;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie la fiche d’une vidéo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const video = await this.videos.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'video',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return video;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprime une vidéo et son fichier' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.videos.remove(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'video',
      entityId: id,
      request,
    });
    return { message: 'Vidéo supprimée.' };
  }
}
