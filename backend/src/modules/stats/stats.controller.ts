import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { CampagnesService } from 'src/modules/campagnes/campagnes.service';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  FenetreDirectDto,
  FiltresCarteDto,
  FiltresStatsDto,
} from './dto/filtres.dto';
import { StatsService } from './stats.service';

@ApiTags('Statistiques')
@Controller('stats')
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly campagnes: CampagnesService,
    private readonly audit: AuditService,
  ) {}

  // ─── Routes publiques (données agrégées et anonymisées) ───────────────────

  @Public()
  @Get('resume')
  @ApiOperation({ summary: 'Chiffres clés (US-PUB-01)' })
  resume(@Query() filtres: FiltresStatsDto) {
    return this.stats.resume(filtres);
  }

  @Public()
  @Get('communes')
  @ApiOperation({ summary: 'Récapitulatif par commune (US-PUB-03)' })
  parCommune(@Query() filtres: FiltresStatsDto) {
    return this.stats.parCommune(filtres);
  }

  @Public()
  @Get('carte')
  @ApiOperation({
    summary: 'GeoJSON des territoires colorés (US-CAR-01)',
    description:
      'Découpage par communes (défaut) ou par départements, selon « niveau ».',
  })
  carte(@Query() filtres: FiltresCarteDto) {
    return this.stats.carteGeoJson(filtres);
  }

  @Public()
  @Get('derniers')
  @ApiOperation({
    summary: 'Derniers dépistages enregistrés, pour l’animation de la carte',
    description:
      'Commune, centroïde et horodatage uniquement : ni résultat ni mesure, ' +
      'que le site public n’a pas à exposer.',
  })
  derniers() {
    return this.stats.derniersDepistages(20, false);
  }

  @Get('derniers-detailles')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Flux entrant détaillé pour le suivi interne' })
  derniersDetailles() {
    return this.stats.derniersDepistages(40, true);
  }

  @Get('direct')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  /*
   * Plafond relevé : la fenêtre de 30 secondes s'interroge toutes les deux
   * secondes, et plusieurs administrateurs peuvent partager une même adresse
   * IP. La limite globale de 100 requêtes par minute les aurait coupés. La
   * requête reste peu coûteuse — fenêtre courte, index sur `created_at`.
   */
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Suivi en direct du flux entrant',
    description:
      'Série par intervalles sur une fenêtre glissante, cumul du jour et ' +
      'communes actives. Fondé sur l’heure d’arrivée de la donnée.',
  })
  direct(@Query() query: FenetreDirectDto) {
    return this.stats.direct(query.fenetre ?? '1h');
  }

  @Public()
  @Get('evolution')
  @ApiOperation({ summary: 'Évolution des dépistages dans le temps' })
  evolution(@Query() filtres: FiltresStatsDto) {
    return this.stats.evolution(filtres);
  }

  @Public()
  @Get('age-sexe')
  @ApiOperation({ summary: 'Répartition par tranche d’âge et par sexe' })
  ageSexe(@Query() filtres: FiltresStatsDto) {
    return this.stats.repartitionAgeSexe(filtres);
  }

  @Public()
  @Get('top-communes')
  @ApiOperation({ summary: 'Top 5 des communes par prévalence' })
  topCommunes(@Query() filtres: FiltresStatsDto) {
    return this.stats.topCommunes(filtres, 5);
  }

  @Public()
  @Get('repartitions')
  @ApiOperation({ summary: 'Répartition par type, résultat et source' })
  repartitions(@Query() filtres: FiltresStatsDto) {
    return this.stats.repartitions(filtres);
  }

  // ─── Routes admin ────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Agrégat complet du tableau de bord (US-ADM-05)' })
  async dashboard(@Query() filtres: FiltresStatsDto) {
    const [resume, evolution, alertes, activite, prochaines] = await Promise.all([
      this.stats.resume(filtres),
      this.stats.evolutionMensuelle12Mois(),
      this.stats.alertes(filtres),
      this.audit.findRecent(10),
      this.campagnes.prochaines(4),
    ]);
    return { resume, evolution, alertes, activite, prochaines };
  }

  @Get('alertes')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Communes au-dessus du seuil d’alerte' })
  alertes(@Query() filtres: FiltresStatsDto) {
    return this.stats.alertes(filtres);
  }

  @Get('points')
  @ApiBearerAuth()
  // Localisation individuelle : donnée sensible, jamais exposée publiquement.
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Points de dépistage pour la carte admin (US-CAR-04)' })
  points(@Query() filtres: FiltresStatsDto) {
    return this.stats.points(filtres, 3000);
  }
}
