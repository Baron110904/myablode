import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional } from 'class-validator';
import { DepistageType, Sexe } from 'src/database/entities';

export enum Periode {
  SEPT_JOURS = '7j',
  TRENTE_JOURS = '30j',
  ANNEE = 'annee',
  TOUT = 'tout',
  PERSONNALISEE = 'perso',
}

/**
 * Filtres partagés par la carte, la page Résultats et le tableau de bord
 * (sections 3.1.2 et 3.3.1).
 */
export class FiltresStatsDto {
  @ApiPropertyOptional({ enum: Periode, default: Periode.TRENTE_JOURS })
  @IsOptional()
  @IsEnum(Periode)
  periode: Periode = Periode.TRENTE_JOURS;

  @ApiPropertyOptional({ description: 'Requis si periode = perso (AAAA-MM-JJ)' })
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({ description: 'Requis si periode = perso (AAAA-MM-JJ)' })
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ enum: DepistageType })
  @IsOptional()
  @IsEnum(DepistageType)
  type?: DepistageType;

  @ApiPropertyOptional({ enum: Sexe })
  @IsOptional()
  @IsEnum(Sexe)
  sexe?: Sexe;

  @ApiPropertyOptional({ description: 'Âge minimum au moment du dépistage' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMin?: number;

  @ApiPropertyOptional({ description: 'Âge maximum au moment du dépistage' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ageMax?: number;

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

  /** Clé de cache : deux jeux de filtres identiques partagent leur résultat. */
  toCacheKey(prefixe: string): string {
    const parts = [
      this.periode,
      this.dateDebut ?? '-',
      this.dateFin ?? '-',
      this.type ?? '-',
      this.sexe ?? '-',
      this.ageMin ?? '-',
      this.ageMax ?? '-',
      this.communeId ?? '-',
      this.campagneId ?? '-',
    ];
    return `${prefixe}:${parts.join('|')}`;
  }
}

export enum NiveauCarte {
  COMMUNE = 'commune',
  DEPARTEMENT = 'departement',
}

/**
 * Filtres de la carte, avec le découpage territorial demandé.
 *
 * `niveau` est isolé dans une classe dérivée plutôt qu'ajouté à
 * `FiltresStatsDto` : les autres endpoints de statistiques n'ont pas de
 * découpage à choisir, et `forbidNonWhitelisted` refuserait le paramètre
 * ailleurs — ce qui est exactement le comportement souhaité.
 */
export class FiltresCarteDto extends FiltresStatsDto {
  @ApiPropertyOptional({
    enum: NiveauCarte,
    default: NiveauCarte.COMMUNE,
    description: 'Découpage affiché : départements (12) ou communes (77)',
  })
  @IsOptional()
  @IsEnum(NiveauCarte)
  niveau: NiveauCarte = NiveauCarte.COMMUNE;

  /** Le niveau fait partie de l'identité du résultat mis en cache. */
  toCacheKey(prefixe: string): string {
    return super.toCacheKey(`${prefixe}:${this.niveau}`);
  }
}

/**
 * Fenêtre du suivi en direct.
 *
 * Indépendante de `FiltresStatsDto` : le direct ne se filtre ni par sexe ni
 * par tranche d'âge — il montre ce qui arrive, tel qu'il arrive.
 */
export class FenetreDirectDto {
  @ApiPropertyOptional({
    enum: ['30s', '5min', '1h', '24h', '7j'],
    default: '1h',
    description: 'Profondeur de la fenêtre glissante',
  })
  @IsOptional()
  @IsIn(['30s', '5min', '1h', '24h', '7j'])
  fenetre?: '30s' | '5min' | '1h' | '24h' | '7j';
}

/** Traduit une période en intervalle de dates exploitable en SQL. */
export function resoudrePeriode(filtres: FiltresStatsDto): {
  debut: string | null;
  fin: string | null;
} {
  const aujourdhui = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const ilYA = (jours: number) => {
    const d = new Date(aujourdhui.getTime());
    d.setDate(d.getDate() - jours);
    return iso(d);
  };

  switch (filtres.periode) {
    case Periode.SEPT_JOURS:
      return { debut: ilYA(7), fin: iso(aujourdhui) };
    case Periode.TRENTE_JOURS:
      return { debut: ilYA(30), fin: iso(aujourdhui) };
    case Periode.ANNEE:
      return { debut: ilYA(365), fin: iso(aujourdhui) };
    case Periode.PERSONNALISEE:
      return { debut: filtres.dateDebut ?? null, fin: filtres.dateFin ?? null };
    case Periode.TOUT:
    default:
      return { debut: null, fin: null };
  }
}
