import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { NewsletterService } from './newsletter.service';

class InscriptionDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;
}

class EnvoiDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  sujet: string;

  @ApiPropertyOptional({ description: 'HTML libre ; ignoré si articleId est fourni' })
  @IsOptional()
  @IsString()
  contenu?: string;

  @ApiPropertyOptional({ description: 'Diffuse un article existant' })
  @IsOptional()
  @IsInt()
  articleId?: number;
}

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly newsletter: NewsletterService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('inscription')
  @HttpCode(HttpStatus.OK)
  // Bride les inscriptions automatisées depuis une même adresse IP.
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Inscription à la lettre (US-PUB-05)' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.newsletter.inscrire(dto.email);
  }

  @Public()
  @Post('desinscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désinscription par jeton' })
  desinscrire(@Body('token') token: string) {
    return this.newsletter.desinscrire(token);
  }

  @Get('abonnes')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Liste des abonnés (US-ADM-12)' })
  abonnes(@Query() pagination: PaginationDto, @Query('actifs') actifs?: string) {
    return this.newsletter.findAbonnes(pagination, actifs === 'true');
  }

  @Get('statistiques')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: 'Nombre d’abonnés actifs et désinscrits' })
  statistiques() {
    return this.newsletter.statistiques();
  }

  @Get('envois')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Historique des envois' })
  envois(@Query() pagination: PaginationDto) {
    return this.newsletter.findEnvois(pagination);
  }

  @Post('envoyer')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Envoie une lettre aux abonnés actifs' })
  async envoyer(
    @Body() dto: EnvoiDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const envoi = await this.newsletter.envoyer(dto);
    await this.audit.log({
      userId: user.id,
      action: 'send',
      entity: 'newsletter',
      entityId: envoi.id,
      metadata: { sujet: envoi.sujet, destinataires: envoi.nb_destinataires },
      request,
    });
    return envoi;
  }

  @Delete('abonnes/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retire un abonné de la liste' })
  async supprimer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.newsletter.supprimerAbonne(id);
    await this.audit.log({
      userId: user.id,
      action: 'delete',
      entity: 'newsletter_abonne',
      entityId: id,
      request,
    });
    return { message: 'Abonné supprimé.' };
  }
}
