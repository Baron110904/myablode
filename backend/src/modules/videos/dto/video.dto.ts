import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { VideoCategorie, VideoStatut } from 'src/database/entities';

/**
 * Le formulaire part en `multipart/form-data` : tous les champs arrivent en
 * chaînes de caractères, y compris les nombres et les booléens. Les
 * transformations ci-dessous les ramènent à leur type avant validation —
 * sans elles, `@IsBoolean` refuserait la chaîne « true » envoyée par le
 * navigateur.
 */
const versBooleen = () =>
  Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

const versEntier = () =>
  Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const nombre = Number(value);
    return Number.isFinite(nombre) ? Math.round(nombre) : value;
  });

export class CreateVideoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire.' })
  @MaxLength(200)
  titre: string;

  /*
   * `| null` est volontaire sur les champs facultatifs : le back-office
   * envoie `null` pour effacer une valeur. `@IsOptional` laisse passer
   * `null` comme `undefined`, mais la différence compte à l'arrivée — seul
   * `null` écrase ce qui est en base.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ enum: VideoCategorie })
  @IsEnum(VideoCategorie, { message: 'Catégorie invalide.' })
  categorie: VideoCategorie;

  @ApiPropertyOptional({ description: 'Image d’attente du lecteur' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  /*
   * Adresse absolue en http(s), ou chemin interne au site. `@IsUrl` serait
   * trop strict : une image déjà déposée dans le site s'écrit « /articles/… »
   * et serait refusée. La contrainte écarte en revanche les schémas exotiques
   * — `javascript:`, `data:` — qui n'ont rien à faire dans un attribut
   * `poster` et ne produiraient qu'un lecteur cassé.
   */
  @Matches(/^(https?:\/\/|\/)[^\s]*$/, {
    message: 'L’image d’attente doit être une adresse http(s) ou un chemin du site.',
  })
  miniature_url?: string | null;

  @ApiPropertyOptional({ description: 'Durée mesurée par le navigateur' })
  @IsOptional()
  @versEntier()
  @IsInt()
  @Min(0)
  // 6 heures : au-delà, c'est une valeur aberrante, pas une vidéo d'association.
  @Max(21600)
  duree_secondes?: number;

  @ApiPropertyOptional({ enum: VideoStatut, default: VideoStatut.DRAFT })
  @IsOptional()
  @IsEnum(VideoStatut)
  statut?: VideoStatut;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @versBooleen()
  @IsBoolean()
  a_la_une?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_publication?: string;
}

/** Le fichier ne se remplace pas : on modifie la fiche, pas la vidéo. */
export class UpdateVideoDto extends PartialType(CreateVideoDto) {}

export class QueryVideosDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VideoCategorie })
  @IsOptional()
  @IsEnum(VideoCategorie)
  categorie?: VideoCategorie;

  @ApiPropertyOptional({ enum: VideoStatut })
  @IsOptional()
  @IsEnum(VideoStatut)
  statut?: VideoStatut;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  limit = 12;
}
