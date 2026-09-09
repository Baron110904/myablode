import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { QueryDepistagesDto } from 'src/modules/depistages/dto/depistage.dto';
import { FiltresStatsDto } from 'src/modules/stats/dto/filtres.dto';

export const FORMATS_EXPORT = ['csv', 'excel', 'xlsx', 'json'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

/**
 * Les DTO d'export étendent les DTO de requête au lieu de les intersecter :
 * le ValidationPipe ne transforme en instance de classe que les types
 * nommés, et les méthodes (toCacheKey, skip) seraient perdues autrement.
 */
export class ExportDepistagesDto extends QueryDepistagesDto {
  @ApiPropertyOptional({ enum: FORMATS_EXPORT, default: 'csv' })
  @IsOptional()
  @IsIn(FORMATS_EXPORT)
  format?: FormatExport = 'csv';

  @ApiPropertyOptional({
    description: 'Colonnes à inclure, séparées par des virgules (toutes par défaut)',
    example: 'nom,prenom,commune,resultat',
  })
  @IsOptional()
  @IsString()
  colonnes?: string;
}

export class ExportCommunesDto extends FiltresStatsDto {
  @ApiPropertyOptional({ enum: FORMATS_EXPORT, default: 'csv' })
  @IsOptional()
  @IsIn(FORMATS_EXPORT)
  format?: FormatExport = 'csv';
}
