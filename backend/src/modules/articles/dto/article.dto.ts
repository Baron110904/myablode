import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ArticleCategorie, ArticleStatut } from 'src/database/entities';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire.' })
  @MaxLength(200)
  titre: string;

  @ApiPropertyOptional({ description: 'Généré depuis le titre si absent' })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional({ description: 'Résumé affiché dans les listes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  extrait?: string;

  @ApiProperty({ description: 'HTML issu de l’éditeur WYSIWYG' })
  @IsString()
  @IsNotEmpty({ message: 'Le contenu est obligatoire.' })
  contenu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  image_url?: string;

  @ApiProperty({ enum: ArticleCategorie })
  @IsEnum(ArticleCategorie, { message: 'Catégorie invalide.' })
  categorie: ArticleCategorie;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  auteur?: string;

  @ApiPropertyOptional({ enum: ['fr', 'en'], default: 'fr' })
  @IsOptional()
  @IsIn(['fr', 'en'])
  langue?: string;

  @ApiPropertyOptional({ enum: ArticleStatut, default: ArticleStatut.DRAFT })
  @IsOptional()
  @IsEnum(ArticleStatut)
  statut?: ArticleStatut;

  @ApiPropertyOptional({
    description: 'Date future = publication programmée (US-ADM-11)',
  })
  @IsOptional()
  @IsDateString()
  date_publication?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  meta_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  meta_description?: string;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

export class QueryArticlesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ArticleCategorie })
  @IsOptional()
  @IsEnum(ArticleCategorie)
  categorie?: ArticleCategorie;

  @ApiPropertyOptional({ enum: ArticleStatut })
  @IsOptional()
  @IsEnum(ArticleStatut)
  statut?: ArticleStatut;

  @ApiPropertyOptional({ description: 'Recherche plein texte titre + contenu' })
  @IsOptional()
  @IsString()
  recherche?: string;

  @ApiPropertyOptional({ enum: ['fr', 'en'] })
  @IsOptional()
  @IsIn(['fr', 'en'])
  langue?: string;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  limit = 12;
}
