import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { slugifier } from 'src/common/normalisation';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { PdfService } from 'src/modules/exports/pdf.service';
import { CampagnesService } from './campagnes.service';
import {
  CreateCampagneDto,
  QueryCampagnesDto,
  UpdateCampagneDto,
} from './dto/campagne.dto';

@ApiTags('Campagnes')
@Controller('campagnes')
export class CampagnesController {
  constructor(
    private readonly campagnes: CampagnesService,
    private readonly audit: AuditService,
    private readonly pdf: PdfService,
  ) {}

  @Public()
  @Get('publiques')
  @ApiOperation({ summary: 'Campagnes visibles sur le site vitrine' })
  publiques(@Query() query: QueryCampagnesDto) {
    return this.campagnes.findAll(query);
  }

  @Public()
  @Get('en-cours')
  @ApiOperation({ summary: 'Campagne actuellement sur le terrain' })
  enCours() {
    return this.campagnes.enCours();
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Liste paginée des campagnes' })
  findAll(@Query() query: QueryCampagnesDto) {
    return this.campagnes.findAll(query);
  }

  @Get('prochaines')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Campagnes à venir (tableau de bord)' })
  prochaines() {
    return this.campagnes.prochaines(4);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Détail d’une campagne' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campagnes.findOne(id);
  }

  @Get(':id/statistiques')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Chiffres consolidés d’une campagne' })
  statistiques(@Param('id', ParseIntPipe) id: number) {
    return this.campagnes.statistiques(id);
  }

  @Get(':id/rapport.pdf')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Rapport PDF de la campagne' })
  async rapportPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const stats = await this.campagnes.statistiques(id);
    await this.audit.log({
      userId: user.id,
      action: 'export',
      entity: 'campagne',
      entityId: id,
      metadata: { format: 'pdf' },
      request,
    });

    /*
     * Le nom porte celui de la campagne : un dossier de rapports nommés
     * « campagne-12-rapport.pdf » est illisible une fois téléchargé.
     */
    const nomFichier = `rapport-campagne-${slugifier(stats.campagne.nom)}-${
      new Date().toISOString().slice(0, 10)
    }.pdf`;

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${nomFichier}"`,
    );
    this.pdf.rapportCampagne(stats, response);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crée une campagne (US-ADM-06)' })
  async create(
    @Body() dto: CreateCampagneDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const campagne = await this.campagnes.create(dto);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'campagne',
      entityId: campagne.id,
      metadata: { nom: campagne.nom },
      request,
    });
    return campagne;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie une campagne' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampagneDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const campagne = await this.campagnes.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'campagne',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return campagne;
  }

  @Post(':id/archiver')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Archive une campagne' })
  async archiver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const campagne = await this.campagnes.archiver(id);
    await this.audit.log({
      userId: user.id,
      action: 'archive',
      entity: 'campagne',
      entityId: id,
      request,
    });
    return campagne;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprime définitivement une campagne' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.campagnes.remove(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'campagne',
      entityId: id,
      request,
    });
    return { message: 'Campagne supprimée.' };
  }
}
