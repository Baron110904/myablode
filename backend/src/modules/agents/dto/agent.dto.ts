import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RoleTerrain, TypeMessageAgent } from 'src/database/entities';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  nom: string;

  @ApiProperty()
  @IsString()
  @Length(2, 100)
  prenom: string;

  @ApiPropertyOptional({
    description: 'Matricule saisi dans le formulaire Kobo, qui rattache ses dépistages',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code_kobo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({ enum: RoleTerrain, default: RoleTerrain.AGENT })
  @IsOptional()
  @IsEnum(RoleTerrain)
  role_terrain?: RoleTerrain;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {}

export class QueryAgentsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Nom, prénom ou matricule' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recherche?: string;

  @ApiPropertyOptional({ enum: RoleTerrain })
  @IsOptional()
  @IsEnum(RoleTerrain)
  role_terrain?: RoleTerrain;

  @ApiPropertyOptional({ description: 'true pour les seuls agents en activité' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  actif?: boolean;

  @ApiPropertyOptional({ description: 'Agents affectés à cette campagne' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campagneId?: number;

  @ApiPropertyOptional({ description: 'Agents affectés à cette commune' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;
}

/**
 * Affectation. Campagne et commune sont toutes deux facultatives : on affecte
 * un agent à une campagne entière, à une commune quelle que soit la campagne,
 * ou au croisement des deux.
 */
export class CreateAffectationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  campagne_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  commune_id?: number;

  @ApiPropertyOptional({ description: 'AAAA-MM-JJ' })
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiPropertyOptional({ description: 'AAAA-MM-JJ' })
  @IsOptional()
  @IsDateString()
  date_fin?: string;
}

export class CreateFelicitationDto {
  @ApiPropertyOptional({ description: 'Agent destinataire' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agent_id?: number;

  @ApiPropertyOptional({ description: 'Équipe d’une commune, sans agent nommé' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  commune_id?: number;

  @ApiProperty({ maxLength: 280 })
  @IsString()
  @Length(3, 280)
  message: string;

  @ApiPropertyOptional({
    enum: TypeMessageAgent,
    default: TypeMessageAgent.ELOGE,
    description: 'Éloge par défaut ; « rappel » pour un signalement',
  })
  @IsOptional()
  @IsEnum(TypeMessageAgent)
  type?: TypeMessageAgent;
}
