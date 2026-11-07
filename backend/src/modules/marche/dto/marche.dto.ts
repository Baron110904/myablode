import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

/** Réglages du formulaire, seuls éléments configurables : les champs sont fixes. */
export class ConfigurerFormulaireDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(3, 200)
  titre: string;

  @ApiPropertyOptional({ description: 'Texte affiché au-dessus des champs' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  introduction?: string | null;

  @ApiPropertyOptional({
    description: 'Date et heure de clôture. Sans elle, le formulaire reste ouvert.',
  })
  @IsOptional()
  @IsDateString()
  date_fermeture?: string | null;

  @ApiPropertyOptional({ description: 'Message affiché une fois la date passée' })
  @IsOptional()
  @IsString()
  @Length(0, 400)
  message_ferme?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Jour et heure du départ, mis en avant sur la fiche pratique',
  })
  @IsOptional()
  @IsDateString()
  date_evenement?: string | null;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  lieu?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true, example: '5 km' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  parcours?: string | null;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  sur_place?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Ce qu’il faut apporter, une ligne par élément',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  a_prevoir?: string | null;

  /*
   * Seuls `http` et `https` sont acceptés. Sans cette restriction, un
   * `javascript:…` collé ici deviendrait un lien cliquable sur une page
   * publique, exécuté dans le navigateur du visiteur.
   */
  @ApiPropertyOptional({
    maxLength: 500,
    nullable: true,
    description:
      'Adresse d’inscription externe. Renseignée, elle remplace le bulletin du site.',
    example: 'https://exemple.org/inscription-marche',
  })
  @IsOptional()
  @ValidateIf((_, valeur) => valeur !== null && valeur !== '')
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Le lien doit commencer par http:// ou https://' },
  )
  @Length(0, 500)
  lien_externe?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  publie?: boolean;
}

/**
 * Bulletin d'inscription.
 *
 * Les bornes sont larges : elles écartent la faute de frappe, pas une
 * catégorie de participants. La marche est ouverte à tous.
 */
export class CreerInscriptionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  formulaire_id: number;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Length(2, 100)
  nom: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Length(2, 100)
  prenom: string;

  @ApiProperty({ minimum: 3, maximum: 120 })
  @Type(() => Number)
  @IsInt({ message: 'L’âge doit être un nombre entier.' })
  @Min(3, { message: 'Âge attendu entre 3 et 120 ans.' })
  @Max(120, { message: 'Âge attendu entre 3 et 120 ans.' })
  age: number;

  @ApiProperty({ enum: ['M', 'F'] })
  @IsIn(['M', 'F'], { message: 'Sexe attendu: M ou F.' })
  sexe: 'M' | 'F';

  @ApiPropertyOptional({ maxLength: 120, description: 'Profession ou rôle déclaré' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fonction?: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Length(2, 100)
  ville: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  quartier?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description:
      'Facultatif. S’il est donné, il est ajouté à la lettre d’information, ' +
      'ce que le formulaire annonce.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse électronique invalide.' })
  @Length(5, 150)
  email?: string;

  @ApiProperty({ maxLength: 30 })
  @IsString()
  @Length(6, 30, { message: 'Numéro de téléphone attendu.' })
  telephone: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  deja_participe?: boolean;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  motivation?: string;
}

export class QueryInscriptionsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  formulaireId?: number;

  @ApiPropertyOptional({ description: 'Nom, prénom ou ville' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  recherche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  traite?: boolean;
}
