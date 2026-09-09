import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser, CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { CHAMPS_CIBLES, SyncOptionsDto, TestConnexionDto, UpdateKoboConfigDto } from './dto/kobo.dto';
import { KoboService } from './kobo.service';

/**
 * Pilotage de l'intégration KoboToolbox.
 *
 * La configuration (jeton API compris) est réservée au super administrateur,
 * conformément à la matrice de permissions de la section 3.2.6.
 */
@ApiTags('KoboToolbox')
@ApiBearerAuth()
@Controller('kobo')
export class KoboController {
  constructor(
    private readonly kobo: KoboService,
    private readonly audit: AuditService,
  ) {}

  @Get('config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Configuration Kobo (jeton masqué)' })
  getConfig() {
    return this.kobo.getConfigPublique();
  }

  @Get('champs-cibles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Colonnes de la base pouvant recevoir un champ Kobo' })
  champsCibles() {
    return CHAMPS_CIBLES;
  }

  @Put('config')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enregistre la configuration Kobo (US-ADM-02)' })
  async updateConfig(
    @Body() dto: UpdateKoboConfigDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.kobo.updateConfig(dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'kobo_config',
      // Le jeton n'apparaît jamais dans le journal d'audit.
      metadata: {
        champs: Object.keys(dto).filter((cle) => cle !== 'api_token'),
        jeton_modifie: Boolean(dto.api_token),
      },
      request,
    });
    return this.kobo.getConfigPublique();
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Teste la connexion à Kobo et liste les formulaires accessibles',
  })
  async tester(
    @Body() dto: TestConnexionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const resultat = await this.kobo.testerConnexion(dto);
    await this.audit.log({
      userId: user.id,
      action: 'test_connexion',
      entity: 'kobo',
      metadata: { ok: resultat.ok },
      request,
    });
    return resultat;
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Lance une synchronisation manuelle (US-ADM-03)' })
  async synchroniser(
    @Body() options: SyncOptionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const resultat = await this.kobo.synchroniser('manuel', options.complet ?? false);
    await this.audit.log({
      userId: user.id,
      action: 'sync',
      entity: 'kobo',
      metadata: {
        declencheur: 'manuel',
        importes: resultat.importes,
        doublons: resultat.doublons,
        erreurs: resultat.erreurs,
      },
      request,
    });
    return resultat;
  }

  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Journal des synchronisations' })
  logs(@Query('limite') limite?: string) {
    return this.kobo.historiqueLogs(Math.min(Number(limite) || 50, 200));
  }
}
