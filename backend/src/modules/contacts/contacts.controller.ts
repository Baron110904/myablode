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
} from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Public, Roles } from 'src/common/decorators';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserRole } from 'src/database/entities';
import { ContactsService } from './contacts.service';

class ReponseBenevoleDto {
  @ApiProperty({ maxLength: 4000, description: 'Texte simple, envoyé par courriel' })
  @IsString()
  @Length(3, 4000)
  reponse: string;
}

/**
 * Décision sur une candidature. La réponse est facultative : on peut accepter
 * sans rien écrire, le courriel de bienvenue suffit.
 */
class DecisionBenevoleDto {
  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @Length(3, 4000)
  reponse?: string;
}

class CreateContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Votre nom est obligatoire.' })
  @MaxLength(120)
  nom: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sujet?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10, { message: 'Votre message doit contenir au moins 10 caractères.' })
  @MaxLength(5000)
  message: string;
}

class CreateBenevoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(100)
  nom: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(100)
  prenom: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @ApiPropertyOptional({ example: 'Week-end' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  disponibilite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

@ApiTags('Contact & bénévoles')
@Controller()
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  // Trois messages par quart d'heure et par IP : suffisant pour un usage
  // légitime, dissuasif pour un formulaire spammé.
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({ summary: 'Envoie un message via le formulaire de contact (US-PUB-06)' })
  envoyerMessage(@Body() dto: CreateContactDto) {
    return this.contacts.creerMessage(dto);
  }

  @Public()
  @Post('benevoles')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @ApiOperation({ summary: 'Candidature de bénévole (US-PUB-07)' })
  candidater(@Body() dto: CreateBenevoleDto) {
    return this.contacts.creerBenevole(dto);
  }

  @Get('contact')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Messages reçus' })
  messages(@Query() pagination: PaginationDto, @Query('traite') traite?: string) {
    return this.contacts.findMessages(
      pagination,
      traite === undefined ? undefined : traite === 'true',
    );
  }

  @Get('benevoles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Candidatures de bénévoles' })
  benevoles(@Query() pagination: PaginationDto, @Query('traite') traite?: string) {
    return this.contacts.findBenevoles(
      pagination,
      traite === undefined ? undefined : traite === 'true',
    );
  }

  @Patch('contact/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marque un message comme traité' })
  marquerMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body('traite') traite: boolean,
  ) {
    return this.contacts.marquerMessage(id, traite ?? true);
  }

  @Post('benevoles/:id/reponse')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Répond à un candidat bénévole',
    description: 'Le message est envoyé par courriel et conservé sur la fiche.',
  })
  repondreBenevole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReponseBenevoleDto,
  ) {
    return this.contacts.repondreBenevole(id, dto.reponse);
  }

  @Post('benevoles/:id/accepter')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Accepte une candidature',
    description:
      'Crée la fiche agent et le compte de consultation. Les identifiants ' +
      'sont renvoyés une seule fois, à remettre en main propre : le courriel ' +
      'de bienvenue ne les contient pas.',
  })
  accepterBenevole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecisionBenevoleDto,
  ) {
    return this.contacts.accepterBenevole(id, dto.reponse);
  }

  @Post('benevoles/:id/refuser')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Refuse une candidature' })
  refuserBenevole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecisionBenevoleDto,
  ) {
    return this.contacts.refuserBenevole(id, dto.reponse);
  }

  @Delete('contact/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprime un message' })
  supprimerMessage(@Param('id', ParseIntPipe) id: number) {
    return this.contacts.supprimerMessage(id);
  }
}
