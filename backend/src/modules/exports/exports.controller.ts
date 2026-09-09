import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthenticatedUser, CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { DepistagesService } from 'src/modules/depistages/depistages.service';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import { StatsService } from 'src/modules/stats/stats.service';
import { ExportCommunesDto, ExportDepistagesDto } from './dto/export.dto';
import { ExportsService } from './exports.service';

/**
 * Exports de données (section 3.4.2).
 *
 * Le rôle Viewer n'obtient que des exports anonymisés : il peut analyser
 * sans accéder à l'identité des personnes dépistées.
 */
@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly depistages: DepistagesService,
    private readonly stats: StatsService,
    private readonly newsletter: NewsletterService,
    private readonly audit: AuditService,
  ) {}

  @Get('depistages')
  // L'export est fermé aux comptes en lecture : un agent consulte, il n'emporte pas.
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exporte les dépistages en CSV, Excel ou JSON (US-ADM-09)' })
  async depistagesExport(
    @Query() query: ExportDepistagesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const format = (query.format ?? 'csv').toLowerCase();
    const colonnes = query.colonnes ? query.colonnes.split(',') : [];
    const anonymise = user.role === UserRole.VIEWER;

    const enregistrements = await this.depistages.findForExport(query);
    const lignes = this.exports.aplatir(enregistrements, colonnes, anonymise);
    const horodatage = new Date().toISOString().slice(0, 10);
    const nomFichier = `depistages-${horodatage}${anonymise ? '-anonymise' : ''}`;

    await this.audit.log({
      userId: user.id,
      action: 'export',
      entity: 'depistage',
      metadata: { format, nombre: lignes.length, anonymise },
      request,
    });

    if (format === 'json') {
      envoyer(response, `${nomFichier}.json`, 'application/json', this.exports.versJson(lignes));
      return;
    }
    if (format === 'excel' || format === 'xlsx') {
      const buffer = await this.exports.versExcel(
        lignes,
        this.exports.resoudreColonnes(colonnes, anonymise),
      );
      envoyer(
        response,
        `${nomFichier}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      );
      return;
    }
    envoyer(
      response,
      `${nomFichier}.csv`,
      'text/csv; charset=utf-8',
      this.exports.versCsv(lignes, this.exports.resoudreColonnes(colonnes, anonymise)),
    );
  }

  @Get('communes')
  // L'export est fermé aux comptes en lecture : un agent consulte, il n'emporte pas.
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exporte le récapitulatif agrégé par commune' })
  async communesExport(
    @Query() filtres: ExportCommunesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const format = (filtres.format ?? 'csv').toLowerCase();
    const communes = await this.stats.parCommune(filtres);
    const lignes = communes.map((commune) => ({
      Commune: commune.nom,
      Département: commune.departement ?? '',
      Dépistages: commune.depistages,
      'Cas détectés': commune.cas,
      Diabète: commune.diabete,
      Obésité: commune.obesite,
      'Taux (%)': commune.taux,
      'Dernier dépistage': commune.derniere_campagne ?? '',
    }));

    const nomFichier = `communes-${new Date().toISOString().slice(0, 10)}`;
    await this.audit.log({
      userId: user.id,
      action: 'export',
      entity: 'communes',
      metadata: { format, nombre: lignes.length },
      request,
    });

    if (format === 'json') {
      envoyer(response, `${nomFichier}.json`, 'application/json', this.exports.versJson(lignes));
      return;
    }
    if (format === 'excel' || format === 'xlsx') {
      const buffer = await this.exports.tableauVersExcel(lignes, 'Communes');
      envoyer(
        response,
        `${nomFichier}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      );
      return;
    }
    envoyer(response, `${nomFichier}.csv`, 'text/csv; charset=utf-8', this.exports.versCsv(lignes));
  }

  @Get('abonnes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Exporte la liste des abonnés à la lettre d’information',
    description: 'Excel par défaut ; « csv » ou « json » sur demande.',
  })
  async abonnesExport(
    @Query('format') formatDemande: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    /*
     * Excel par défaut : cette liste s'ouvre dans un tableur pour préparer un
     * envoi, elle ne se relit pas dans un éditeur de texte.
     */
    const format = (formatDemande ?? 'excel').toLowerCase();
    const abonnes = await this.newsletter.tousLesAbonnes();

    const lignes = abonnes.map((abonne) => ({
      Adresse: abonne.email,
      Statut: abonne.active ? 'Actif' : 'Désinscrit',
      'Inscrit le': abonne.created_at.toISOString().slice(0, 10),
    }));

    const nomFichier = `abonnes-newsletter-${new Date().toISOString().slice(0, 10)}`;
    await this.audit.log({
      userId: user.id,
      action: 'export',
      entity: 'newsletter',
      metadata: { format, nombre: lignes.length },
      request,
    });

    if (format === 'json') {
      envoyer(response, `${nomFichier}.json`, 'application/json', this.exports.versJson(lignes));
      return;
    }
    if (format === 'csv') {
      envoyer(
        response,
        `${nomFichier}.csv`,
        'text/csv; charset=utf-8',
        this.exports.versCsv(lignes),
      );
      return;
    }

    const buffer = await this.exports.tableauVersExcel(lignes, 'Abonnés');
    envoyer(
      response,
      `${nomFichier}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    );
  }
}

function envoyer(
  response: Response,
  nomFichier: string,
  contentType: string,
  contenu: string | Buffer,
): void {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
  response.send(contenu);
}
