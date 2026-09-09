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
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthenticatedUser, CurrentUser, Public, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  ConfigurerFormulaireDto,
  CreerInscriptionDto,
  QueryInscriptionsDto,
} from './dto/marche.dto';
import { MarcheService } from './marche.service';

@ApiTags('Marche Sucre à terre')
@Controller('marche')
export class MarcheController {
  constructor(
    private readonly marche: MarcheService,
    private readonly audit: AuditService,
  ) {}

  /* ─── Site public ──────────────────────────────────────────────────── */

  @Public()
  @Get('formulaire/:articleId')
  @ApiOperation({
    summary: 'Formulaire publié sur un article',
    description:
      'Renvoie null si aucun formulaire n’est publié sur cet article. Un ' +
      'formulaire fermé reste visible : il faut annoncer la clôture, pas la ' +
      'faire disparaître.',
  })
  formulairePublic(@Param('articleId', ParseIntPipe) articleId: number) {
    return this.marche.vuePublique(articleId);
  }

  @Public()
  @Post('inscriptions')
  @HttpCode(HttpStatus.CREATED)
  /*
   * Cinq inscriptions par minute et par adresse : une famille s'inscrit
   * depuis le même téléphone, un robot n'aurait pas cette patience.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inscription à la marche depuis le site public' })
  inscrire(@Body() dto: CreerInscriptionDto) {
    return this.marche.inscrire(dto);
  }

  /* ─── Back-office ──────────────────────────────────────────────────── */

  @Get('formulaires/:articleId')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Réglages du formulaire d’un article' })
  formulaire(@Param('articleId', ParseIntPipe) articleId: number) {
    return this.marche.parArticle(articleId);
  }

  @Put('formulaires/:articleId')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Configure et publie le formulaire sur un article' })
  async configurer(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Body() dto: ConfigurerFormulaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const formulaire = await this.marche.configurer(articleId, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'article',
      entityId: articleId,
      metadata: { formulaireMarche: formulaire.id, publie: formulaire.publie },
      request,
    });
    return formulaire;
  }

  @Delete('formulaires/:articleId')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Retire le formulaire d’un article',
    description: 'Les inscriptions déjà reçues sont supprimées avec lui.',
  })
  async supprimer(
    @Param('articleId', ParseIntPipe) articleId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const resultat = await this.marche.supprimer(articleId);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'article',
      entityId: articleId,
      metadata: { formulaireMarche: true },
      request,
    });
    return resultat;
  }

  @Get('inscriptions')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Inscriptions reçues, paginées' })
  inscriptions(@Query() query: QueryInscriptionsDto) {
    return this.marche.listerInscriptions(query);
  }

  @Get('inscriptions/statistiques')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Répartition des inscrits, pour préparer la marche' })
  statistiques(@Query('formulaireId') formulaireId?: string) {
    return this.marche.statistiques(
      formulaireId ? Number(formulaireId) : undefined,
    );
  }

  @Patch('inscriptions/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marque une inscription comme traitée' })
  marquer(
    @Param('id', ParseIntPipe) id: number,
    @Body('traite') traite?: boolean,
  ) {
    return this.marche.marquer(id, traite ?? true);
  }
}
