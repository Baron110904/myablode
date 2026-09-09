import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CampagneStatut } from 'src/database/entities';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class CreateCampagneDto {
  @ApiProperty({ example: 'Campagne de Cotonou — Août 2026' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la campagne est obligatoire.' })
  @MaxLength(150)
  nom: string;

  @ApiProperty({ example: '2026-08-12' })
  @IsDateString({}, { message: 'Date de début invalide (format AAAA-MM-JJ).' })
  date_debut: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Date de fin invalide (format AAAA-MM-JJ).' })
  date_fin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  commune_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsable?: string;

  @ApiPropertyOptional({ description: 'Un participant par ligne' })
  @IsOptional()
  @IsString()
  equipe?: string;

  @ApiPropertyOptional({ enum: CampagneStatut })
  @IsOptional()
  @IsEnum(CampagneStatut)
  statut?: CampagneStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  photo_url?: string;
}

export class UpdateCampagneDto extends PartialType(CreateCampagneDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archivee?: boolean;
}

export class QueryCampagnesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CampagneStatut })
  @IsOptional()
  @IsEnum(CampagneStatut)
  statut?: CampagneStatut;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le responsable' })
  @IsOptional()
  @IsString()
  recherche?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inclureArchivees?: boolean = false;
}
