import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateKoboConfigDto {
  @ApiPropertyOptional({ example: 'https://kf.kobotoolbox.org' })
  @IsOptional()
  @IsString()
  api_url?: string;

  @ApiPropertyOptional({
    description: 'Jeton API Kobo. Laisser vide pour conserver le jeton existant.',
  })
  @IsOptional()
  @IsString()
  api_token?: string;

  @ApiPropertyOptional({ description: 'UID de l’asset Kobo, ex. aBcDeFgH12345' })
  @IsOptional()
  @IsString()
  form_id?: string;

  @ApiPropertyOptional({ description: 'Intervalle en minutes (5 à 1440)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5, { message: 'L’intervalle minimum est de 5 minutes.' })
  @Max(1440, { message: 'L’intervalle maximum est de 24 heures.' })
  sync_interval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_sync_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Correspondance champ Kobo → colonne, ex. { "nom_complet": "nom" }',
  })
  @IsOptional()
  @IsObject()
  field_mapping?: Record<string, string>;
}

export class TestConnexionDto {
  @ApiPropertyOptional({ description: 'Teste ces valeurs sans les enregistrer' })
  @IsOptional()
  @IsString()
  api_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  api_token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  form_id?: string;
}

export class SyncOptionsDto {
  @ApiPropertyOptional({
    description: 'Rejoue toutes les soumissions au lieu des seules nouvelles',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  complet?: boolean = false;
}

/** Colonnes de `depistages` qu'un champ Kobo peut alimenter. */
export const CHAMPS_CIBLES = [
  'code_unique',
  'nom',
  'prenom',
  'date_naissance',
  'sexe',
  'telephone',
  'commune_id',
  'date_depistage',
  'type',
  'glycemie',
  'imc',
  'poids',
  'taille',
  'resultat',
  'oriente_centre',
  'notes',
  'latitude',
  'longitude',
] as const;

export type ChampCible = (typeof CHAMPS_CIBLES)[number];

/**
 * Correspondance par défaut, calquée sur un formulaire de dépistage type.
 * L'administrateur l'ajuste depuis Paramètres → Kobo une fois le vrai
 * formulaire connecté.
 */
export const MAPPING_PAR_DEFAUT: Record<string, ChampCible> = {
  code_beneficiaire: 'code_unique',
  code: 'code_unique',
  nom: 'nom',
  nom_complet: 'nom',
  prenom: 'prenom',
  prenoms: 'prenom',
  date_naissance: 'date_naissance',
  date_nais: 'date_naissance',
  sexe: 'sexe',
  sexe_h_f: 'sexe',
  genre: 'sexe',
  telephone: 'telephone',
  tel: 'telephone',
  commune: 'commune_id',
  commune_res: 'commune_id',
  date_depistage: 'date_depistage',
  date_test: 'date_depistage',
  type_depistage: 'type',
  glycemie: 'glycemie',
  glyc_mgdl: 'glycemie',
  imc: 'imc',
  imc_calc: 'imc',
  poids: 'poids',
  poids_kg: 'poids',
  taille: 'taille',
  taille_cm: 'taille',
  resultat: 'resultat',
  oriente: 'oriente_centre',
  oriente_centre: 'oriente_centre',
  notes: 'notes',
  observations: 'notes',
};
