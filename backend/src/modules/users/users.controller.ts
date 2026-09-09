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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

/** Gestion des comptes : réservée au super administrateur (section 3.2.6). */
@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des comptes (US-ADM-14)' })
  findAll(@Query() pagination: PaginationDto, @Query('recherche') recherche?: string) {
    return this.users.findAll(pagination, recherche);
  }

  @Get('statistiques')
  @ApiOperation({ summary: 'Répartition des comptes par rôle' })
  statistiques() {
    return this.users.statistiques();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un compte' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crée un compte administrateur' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() auteur: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const { user, motDePasseTemporaire } = await this.users.create(dto);
    await this.audit.log({
      userId: auteur.id,
      action: 'create',
      entity: 'user',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      request,
    });
    // Le mot de passe temporaire n'est affiché qu'ici, une seule fois.
    return { user, motDePasseTemporaire };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifie un compte' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() auteur: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const user = await this.users.update(id, dto, auteur.id);
    await this.audit.log({
      userId: auteur.id,
      action: 'update',
      entity: 'user',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return user;
  }

  @Post(':id/reinitialiser-mot-de-passe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Génère un nouveau mot de passe temporaire' })
  async reinitialiser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() auteur: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const motDePasseTemporaire = await this.users.reinitialiserMotDePasse(id);
    await this.audit.log({
      userId: auteur.id,
      action: 'reset_password',
      entity: 'user',
      entityId: id,
      request,
    });
    return {
      motDePasseTemporaire,
      message:
        'Transmettez ce mot de passe à la personne concernée par un canal sûr. ' +
        'Il ne sera plus affiché.',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprime un compte' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() auteur: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.users.remove(id, auteur.id);
    await this.audit.log({
      userId: auteur.id,
      action: 'delete',
      entity: 'user',
      entityId: id,
      request,
    });
    return { message: 'Compte supprimé.' };
  }
}
