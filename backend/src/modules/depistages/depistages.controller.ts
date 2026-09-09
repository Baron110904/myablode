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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser, CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { DepistagesService } from './depistages.service';
import {
  CreateDepistageDto,
  QueryDepistagesDto,
  UpdateDepistageDto,
  ValidationMasseDto,
} from './dto/depistage.dto';

/**
 * Les dépistages contiennent des données nominatives de santé : aucune route
 * de ce contrôleur n'est publique (section 6.2 « Donnée de santé »).
 */
@ApiTags('Dépistages')
@ApiBearerAuth()
@Controller('depistages')
export class DepistagesController {
  constructor(
    private readonly depistages: DepistagesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Liste paginée avec recherche et filtres',
    description:
      'Un compte en lecture ne voit que ses propres dépistages et ceux des ' +
      'campagnes ou communes auxquelles il est affecté. Le périmètre est ' +
      'appliqué côté serveur : il ne peut pas être contourné par un paramètre.',
  })
  findAll(
    @Query() query: QueryDepistagesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depistages.findAll(
      query,
      user.role === UserRole.VIEWER ? user.email : undefined,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Détail d’un dépistage',
    description:
      'Soumis au même périmètre que la liste pour un compte en lecture : ' +
      'hors périmètre, la fiche est déclarée introuvable.',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depistages.findOne(
      id,
      user.role === UserRole.VIEWER ? user.email : undefined,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Saisie manuelle d’un dépistage (US-ADM-07)' })
  async create(
    @Body() dto: CreateDepistageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const depistage = await this.depistages.create(dto, user.id);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'depistage',
      entityId: depistage.id,
      metadata: { source: 'manual', commune_id: depistage.commune_id },
      request,
    });
    return depistage;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie un dépistage (US-ADM-08)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepistageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const depistage = await this.depistages.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'depistage',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return depistage;
  }

  @Post('validation-masse')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marque plusieurs enregistrements comme vérifiés' })
  async validerEnMasse(
    @Body() dto: ValidationMasseDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const nombre = await this.depistages.validerEnMasse(dto.ids, dto.verifie);
    await this.audit.log({
      userId: user.id,
      action: dto.verifie ? 'verify' : 'unverify',
      entity: 'depistage',
      metadata: { nombre, ids: dto.ids.slice(0, 50) },
      request,
    });
    return { message: `${nombre} enregistrement(s) mis à jour.`, nombre };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Suppression logique (archivage)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.depistages.softDelete(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'depistage',
      entityId: id,
      request,
    });
    return { message: 'Dépistage archivé.' };
  }

  @Post(':id/restaurer')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restaure un dépistage archivé' })
  async restaurer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.depistages.restaurer(id);
    await this.audit.log({
      userId: user.id,
      action: 'restore',
      entity: 'depistage',
      entityId: id,
      request,
    });
    return { message: 'Dépistage restauré.' };
  }
}
