import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
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
import { CreateEvenementDto, UpdateEvenementDto } from './dto/evenement.dto';
import { EvenementsService } from './evenements.service';
import { ThrottleLecture } from 'src/common/throttle-lecture';

@ApiTags('Événements')
@ThrottleLecture()
@Controller('evenements')
export class EvenementsController {
  constructor(
    private readonly evenements: EvenementsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get('publics')
  @ApiOperation({ summary: 'Programme à venir (bandeau et encart de l’accueil)' })
  publics() {
    return this.evenements.findPublics(8);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Tous les événements, passés compris' })
  findAll() {
    return this.evenements.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ajoute une date au programme' })
  async create(
    @Body() dto: CreateEvenementDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const evenement = await this.evenements.create(dto);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'evenement',
      entityId: evenement.id,
      metadata: { titre: evenement.titre, date_debut: evenement.date_debut },
      request,
    });
    return evenement;
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie une date du programme' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvenementDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const evenement = await this.evenements.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'evenement',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return evenement;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retire une date du programme' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.evenements.remove(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'evenement',
      entityId: id,
      request,
    });
    return { message: 'Événement supprimé.' };
  }
}
