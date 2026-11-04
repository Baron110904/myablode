import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEvenementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire.' })
  @MaxLength(200)
  titre: string;

  /*
   * `| null` est volontaire sur les champs facultatifs : le back-office
   * envoie `null` pour effacer une valeur. Une clé simplement absente
   * laisserait l'ancienne en place, et un lieu effacé réapparaîtrait.
   */
  @ApiPropertyOptional({ description: 'Précision affichée sous le titre' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sous_titre?: string | null;

  @ApiProperty({ example: '2026-11-14' })
  @IsDateString({}, { message: 'La date de début est invalide.' })
  date_debut: string;

  @ApiPropertyOptional({ description: 'Pour une opération de plusieurs jours' })
  @IsOptional()
  @IsDateString({}, { message: 'La date de fin est invalide.' })
  date_fin?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lieu?: string | null;

  @ApiPropertyOptional({ description: 'Phrase reprise dans l’encart des grandes dates' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ example: '6ᵉ édition' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  edition?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  publie?: boolean;
}

export class UpdateEvenementDto extends PartialType(CreateEvenementDto) {}
