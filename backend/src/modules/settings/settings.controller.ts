import { Body, Controller, Get, Param, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { SettingsService } from './settings.service';

@ApiTags('Paramètres')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'Paramètres exposés au site vitrine (seuils d’affichage, langues)',
  })
  async publics() {
    const [seuils, langues, langueDefaut, seuilAlerte] = await Promise.all([
      this.settings.seuilsCliniques(),
      this.settings.get<string[]>('langues_actives', ['fr']),
      this.settings.get<string>('langue_defaut', 'fr'),
      this.settings.getNumber('seuil_alerte_prevalence', 10),
    ]);
    return { seuils, langues, langueDefaut, seuilAlerte };
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Tous les paramètres système' })
  findAll() {
    return this.settings.findAll();
  }

  @Get('groupe/:groupe')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Paramètres d’un groupe (seuils, langues, securite…)' })
  findByGroupe(@Param('groupe') groupe: string) {
    return this.settings.findByGroupe(groupe);
  }

  @Put()
  @ApiBearerAuth()
  // Les seuils cliniques engagent l'interprétation médicale : super admin seul.
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Met à jour plusieurs paramètres (US-ADM-15)' })
  async update(
    @Body() valeurs: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const resultats = await this.settings.setMany(valeurs);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'settings',
      metadata: { cles: Object.keys(valeurs) },
      request,
    });
    return resultats;
  }
}
