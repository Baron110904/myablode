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
import { TypeMessageAgent, UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { AgentsService } from './agents.service';
import {
  CreateAffectationDto,
  CreateAgentDto,
  CreateFelicitationDto,
  QueryAgentsDto,
  UpdateAgentDto,
} from './dto/agent.dto';

/**
 * Agents de terrain. Aucune route publique : ce sont des données nominatives
 * de personnel, sans intérêt pour un visiteur.
 */
@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Liste paginée des agents, avec leurs affectations' })
  findAll(@Query() query: QueryAgentsDto) {
    return this.agents.findAll(query);
  }

  @Get('messages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Derniers éloges et rappels adressés aux agents',
    description:
      'Accessible aux comptes en lecture : c’est la page où un agent voit ' +
      'ce qui a été adressé à lui et à ses collègues.',
  })
  messages(@Query('type') type?: TypeMessageAgent) {
    return this.agents.derniersMessages(30, type);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Fiche d’un agent' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agents.findOne(id);
  }

  @Get(':id/statistiques')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Collecte réalisée par un agent' })
  statistiques(@Param('id', ParseIntPipe) id: number) {
    return this.agents.statistiques(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crée un agent de terrain' })
  async create(
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const agent = await this.agents.create(dto);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'agent',
      entityId: agent.id,
      metadata: { nom: `${agent.prenom} ${agent.nom}` },
      request,
    });
    return agent;
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Modifie un agent' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const agent = await this.agents.update(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'agent',
      entityId: id,
      metadata: { champs: Object.keys(dto) },
      request,
    });
    return agent;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Désactive un agent',
    description:
      'L’agent sort des listes actives mais garde ses dépistages : les ' +
      'supprimer effacerait qui a collecté quoi.',
  })
  async desactiver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const agent = await this.agents.desactiver(id);
    await this.audit.log({
      userId: user.id,
      action: 'archive',
      entity: 'agent',
      entityId: id,
      request,
    });
    return agent;
  }

  @Post(':id/affectations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Affecte un agent à une campagne ou à une commune' })
  async affecter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAffectationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const affectation = await this.agents.affecter(id, dto);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'agent',
      entityId: id,
      metadata: {
        affectation: affectation.id,
        campagne: dto.campagne_id,
        commune: dto.commune_id,
      },
      request,
    });
    return affectation;
  }

  @Delete(':id/affectations/:affectationId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retire une affectation' })
  async retirerAffectation(
    @Param('id', ParseIntPipe) id: number,
    @Param('affectationId', ParseIntPipe) affectationId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.agents.retirerAffectation(id, affectationId);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'agent',
      entityId: id,
      metadata: { affectation: affectationId },
      request,
    });
    return { message: 'Affectation retirée.' };
  }

  @Post('felicitations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Adresse des félicitations à un agent ou à une équipe communale',
  })
  async feliciter(
    @Body() dto: CreateFelicitationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const felicitation = await this.agents.feliciter(dto, user.id);
    await this.audit.log({
      userId: user.id,
      action: 'create',
      entity: 'agent',
      entityId: dto.agent_id ?? null,
      metadata: { felicitation: felicitation.id, commune: dto.commune_id },
      request,
    });
    return felicitation;
  }
}
