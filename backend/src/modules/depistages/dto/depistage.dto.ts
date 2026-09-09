import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  DepistageResultat,
  DepistageSource,
  DepistageType,
  Sexe,
} from 'src/database/entities';

export class CreateDepistageDto {
  @ApiPropertyOptional({ description: 'Code interne du dépisté' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code_unique?: string;

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

  @ApiProperty({ example: '1985-04-12' })
  @IsDateString({}, { message: 'Date de naissance invalide (AAAA-MM-JJ).' })
  date_naissance: string;

  @ApiProperty({ enum: Sexe })
  @IsEnum(Sexe, { message: 'Le sexe doit être M ou F.' })
  sexe: Sexe;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'La commune est obligatoire.' })
  commune_id: number;

  @ApiProperty({ example: '2026-08-24' })
  @IsDateString({}, { message: 'Date de dépistage invalide (AAAA-MM-JJ).' })
  date_depistage: string;

  @ApiProperty({ enum: DepistageType })
  @IsEnum(DepistageType, { message: 'Type de dépistage invalide.' })
  type: DepistageType;

  @ApiPropertyOptional({ description: 'Glycémie en mg/dL' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La glycémie doit être un nombre.' })
  @Min(10, { message: 'Glycémie hors plage plausible (10–900 mg/dL).' })
  @Max(900, { message: 'Glycémie hors plage plausible (10–900 mg/dL).' })
  glycemie?: number;

  @ApiPropertyOptional({ description: 'Poids en kilogrammes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le poids doit être un nombre.' })
  @Min(2, { message: 'Poids hors plage plausible (2–400 kg).' })
  @Max(400, { message: 'Poids hors plage plausible (2–400 kg).' })
  poids?: number;

  @ApiPropertyOptional({ description: 'Taille en centimètres' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La taille doit être un nombre.' })
  @Min(30, { message: 'Taille hors plage plausible (30–250 cm).' })
  @Max(250, { message: 'Taille hors plage plausible (30–250 cm).' })
  taille?: number;

  /*
   * L'IMC reste acceptable en saisie directe pour les dépistages dont le
   * poids et la taille n'ont pas été relevés. Quand les deux sont fournis,
   * le service recalcule et ignore cette valeur.
   */
  @ApiPropertyOptional({ description: 'Calculé si poids et taille sont fournis' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'L’IMC doit être un nombre.' })
  @Min(8, { message: 'IMC hors plage plausible (8–90).' })
  @Max(90, { message: 'IMC hors plage plausible (8–90).' })
  imc?: number;

  @ApiPropertyOptional({
    enum: DepistageResultat,
    description: 'Déduit des seuils cliniques si absent',
  })
  @IsOptional()
  @IsEnum(DepistageResultat)
  resultat?: DepistageResultat;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'La campagne associée est obligatoire.' })
  campagne_id: number;

  @ApiProperty()
  @IsBoolean()
  oriente_centre: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Latitude WGS84' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude WGS84' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class UpdateDepistageDto extends PartialType(CreateDepistageDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  verifie?: boolean;
}

export class QueryDepistagesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Nom, prénom, code ou téléphone' })
  @IsOptional()
  @IsString()
  recherche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campagneId?: number;

  @ApiPropertyOptional({ enum: DepistageResultat })
  @IsOptional()
  @IsEnum(DepistageResultat)
  resultat?: DepistageResultat;

  @ApiPropertyOptional({ enum: DepistageType })
  @IsOptional()
  @IsEnum(DepistageType)
  type?: DepistageType;

  @ApiPropertyOptional({ enum: DepistageSource })
  @IsOptional()
  @IsEnum(DepistageSource)
  source?: DepistageSource;

  @ApiPropertyOptional({ enum: Sexe })
  @IsOptional()
  @IsEnum(Sexe)
  sexe?: Sexe;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ description: 'true = uniquement les enregistrements vérifiés' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifie?: boolean;

  @ApiPropertyOptional({
    enum: ['date_depistage', 'nom', 'created_at', 'resultat'],
    default: 'date_depistage',
  })
  @IsOptional()
  @IsString()
  triPar?: string = 'date_depistage';
  @ApiPropertyOptional({
    description: 'Ne renvoyer que les mesures signalées hors norme',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  horsNorme?: boolean;

}

export class ValidationMasseDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ description: 'true pour marquer comme vérifiés' })
  @IsBoolean()
  verifie: boolean;
}
