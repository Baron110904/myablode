import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { AuthenticatedUser, CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { assainirHtml } from 'src/modules/articles/sanitize-html';
import { GABARITS, gabaritParCle } from './gabarits';
import { AuditService } from 'src/modules/audit/audit.service';
import { SettingsService } from 'src/modules/settings/settings.service';
import { MailService } from './mail.service';

class ConfigurationSmtpDto {
  @ApiProperty({ example: 'smtp-relay.sendinblue.com' })
  @IsString()
  @IsNotEmpty({ message: 'L’adresse du serveur est obligatoire.' })
  host: string;

  @ApiProperty({ example: 587 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ description: 'Laisser vide pour conserver le mot de passe actuel' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'MyABLODE <no-reply@ablode.bj>' })
  @IsString()
  @IsNotEmpty({ message: 'L’adresse d’expédition est obligatoire.' })
  from: string;

  @ApiPropertyOptional({ description: 'TLS implicite ; déduit du port si absent' })
  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}

class EnvoiTestDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  destinataire: string;
}

/** Clé de stockage de la configuration SMTP dans les paramètres système. */
const CLE_SMTP = 'email_smtp';

/**
 * Modification d'un message. Les deux champs sont facultatifs : les laisser
 * vides rétablit le texte d'origine.
 */
class ModifierGabaritDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  sujet?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  corps?: string;
}

/**
 * Configuration des envois d'emails (section 3.2.7 « Email »).
 *
 * La configuration est enregistrée en base plutôt que dans le fichier
 * d'environnement : l'association peut changer d'hébergeur mail sans accès
 * au serveur ni redémarrage.
 */
@ApiTags('Email')
@ApiBearerAuth()
@Controller('mail')
@Roles(UserRole.SUPER_ADMIN)
export class MailController {
  constructor(
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Configuration d’envoi courante (mot de passe masqué)' })
  async getConfig() {
    const active = this.mail.configurationPublique();
    return {
      configure: this.mail.estConfigure(),
      ...(active ?? {
        host: '',
        port: 587,
        user: '',
        from: '',
        motDePasseDefini: false,
      }),
    };
  }

  @Put('config')
  @ApiOperation({ summary: 'Enregistre la configuration d’envoi' })
  async updateConfig(
    @Body() dto: ConfigurationSmtpDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    // Champ mot de passe vide = « ne pas modifier », pas « effacer ».
    const existante = await this.settings.get<Record<string, unknown> | null>(
      CLE_SMTP,
      null,
    );
    const motDePasse =
      dto.password || ((existante?.password as string | undefined) ?? undefined);

    const configuration = { ...dto, password: motDePasse };
    await this.settings.definir(
      CLE_SMTP,
      configuration,
      'email',
      'Serveur d’envoi des emails',
    );
    this.mail.appliquer(configuration);

    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'email_config',
      // Le mot de passe SMTP ne figure jamais dans le journal.
      metadata: { host: dto.host, port: dto.port, from: dto.from },
      request,
    });

    return this.getConfig();
  }

  @Get('gabarits')
  @ApiOperation({
    summary: 'Messages envoyés par la plateforme, avec leurs réglages',
    description:
      'Chaque entrée porte le texte d’origine, le réglage éventuel de ' +
      'l’administrateur, et les variables utilisables.',
  })
  async gabarits() {
    return Promise.all(
      GABARITS.map(async (origine) => {
        const regle = await this.settings
          .get<{ sujet?: string; corps?: string } | null>(origine.cle, null)
          .catch(() => null);

        return {
          cle: origine.cle,
          libelle: origine.libelle,
          description: origine.description,
          variables: origine.variables,
          /* Ce qui partira réellement : le réglage, ou le texte d'origine. */
          sujet: regle?.sujet?.trim() || origine.sujet,
          corps: regle?.corps?.trim() || origine.corps,
          sujetOrigine: origine.sujet,
          corpsOrigine: origine.corps,
          personnalise: Boolean(regle?.sujet?.trim() || regle?.corps?.trim()),
        };
      }),
    );
  }

  @Put('gabarits/:cle')
  @ApiOperation({
    summary: 'Modifie un message',
    description:
      'Un champ vide rétablit le texte d’origine : c’est ainsi qu’on annule ' +
      'une personnalisation.',
  })
  async modifierGabarit(
    @Param('cle') cle: string,
    @Body() dto: ModifierGabaritDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const origine = gabaritParCle(cle);
    if (!origine) {
      throw new NotFoundException(`Message « ${cle} » inconnu.`);
    }

    /*
     * Le corps passe par l'assainisseur des articles : il part dans un
     * courriel, et un gabarit est modifiable depuis l'interface.
     */
    const corps = dto.corps?.trim() ? assainirHtml(dto.corps) : '';
    const sujet = dto.sujet?.trim() ?? '';

    /*
     * Deux chaînes vides plutôt que `null` : la colonne de valeur n'accepte
     * pas le nul, et le résolveur traite déjà le vide comme « reprendre le
     * texte d'origine ». Rétablir revient donc à effacer les deux champs.
     */
    await this.settings.definir(cle, { sujet, corps }, 'email', origine.libelle);

    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'setting',
      metadata: { gabarit: cle, retabli: !sujet && !corps },
      request,
    });

    return {
      cle,
      sujet: sujet || origine.sujet,
      corps: corps || origine.corps,
      personnalise: Boolean(sujet || corps),
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifie la connexion au serveur, sans envoyer de message' })
  async tester(@Body() dto: Partial<ConfigurationSmtpDto>) {
    if (!dto?.host) {
      return this.mail.tester();
    }
    // Permet de tester des paramètres avant de les enregistrer.
    const existante = await this.settings.get<Record<string, unknown> | null>(
      CLE_SMTP,
      null,
    );
    return this.mail.tester({
      host: dto.host,
      port: dto.port ?? 587,
      user: dto.user,
      password: dto.password || ((existante?.password as string | undefined) ?? undefined),
      from: dto.from ?? '',
      secure: dto.secure,
    });
  }

  @Post('test-envoi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoie un message de test à une adresse' })
  async testerEnvoi(
    @Body() dto: EnvoiTestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const resultat = await this.mail.envoyerTest(dto.destinataire);
    await this.audit.log({
      userId: user.id,
      action: 'test_email',
      entity: 'email_config',
      metadata: { destinataire: dto.destinataire, ok: resultat.ok },
      request,
    });
    return resultat;
  }
}
