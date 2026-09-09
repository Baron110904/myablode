import { FiltresStatsDto, Periode, resoudrePeriode } from './filtres.dto';
import { DepistageType, Sexe } from 'src/database/entities';

function creerFiltres(partiel: Partial<FiltresStatsDto> = {}): FiltresStatsDto {
  return Object.assign(new FiltresStatsDto(), partiel);
}

describe('resoudrePeriode', () => {
  /**
   * La fonction renvoie une date calendaire (AAAA-MM-JJ), pas un instant :
   * comparer des timestamps ferait échouer le test l'après-midi, quand les
   * heures écoulées depuis minuit font basculer l'arrondi.
   */
  const dateAttendue = (joursAvant: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - joursAvant);
    return date.toISOString().slice(0, 10);
  };

  it('résout 7 jours', () => {
    const { debut, fin } = resoudrePeriode(creerFiltres({ periode: Periode.SEPT_JOURS }));
    expect(debut).toBe(dateAttendue(7));
    expect(fin).toBe(dateAttendue(0));
  });

  it('résout 30 jours', () => {
    const { debut } = resoudrePeriode(creerFiltres({ periode: Periode.TRENTE_JOURS }));
    expect(debut).toBe(dateAttendue(30));
  });

  it('résout une année glissante', () => {
    const { debut } = resoudrePeriode(creerFiltres({ periode: Periode.ANNEE }));
    expect(debut).toBe(dateAttendue(365));
  });

  it('ne borne pas la période « tout »', () => {
    const { debut, fin } = resoudrePeriode(creerFiltres({ periode: Periode.TOUT }));
    expect(debut).toBeNull();
    expect(fin).toBeNull();
  });

  it('reprend les dates fournies pour une période personnalisée', () => {
    const { debut, fin } = resoudrePeriode(
      creerFiltres({
        periode: Periode.PERSONNALISEE,
        dateDebut: '2026-01-01',
        dateFin: '2026-06-30',
      }),
    );
    expect(debut).toBe('2026-01-01');
    expect(fin).toBe('2026-06-30');
  });
});

describe('FiltresStatsDto.toCacheKey', () => {
  it('produit la même clé pour des filtres identiques', () => {
    const a = creerFiltres({ periode: Periode.TRENTE_JOURS, type: DepistageType.DIABETE });
    const b = creerFiltres({ periode: Periode.TRENTE_JOURS, type: DepistageType.DIABETE });
    expect(a.toCacheKey('stats:resume')).toBe(b.toCacheKey('stats:resume'));
  });

  it('produit des clés différentes pour des filtres différents', () => {
    const diabete = creerFiltres({ type: DepistageType.DIABETE });
    const obesite = creerFiltres({ type: DepistageType.OBESITE });
    expect(diabete.toCacheKey('stats:resume')).not.toBe(
      obesite.toCacheKey('stats:resume'),
    );
  });

  it('distingue le sexe et la tranche d’âge', () => {
    const base = creerFiltres();
    const femmes = creerFiltres({ sexe: Sexe.F });
    const jeunes = creerFiltres({ ageMin: 18, ageMax: 34 });

    const cles = new Set([
      base.toCacheKey('p'),
      femmes.toCacheKey('p'),
      jeunes.toCacheKey('p'),
    ]);
    expect(cles.size).toBe(3);
  });

  it('préfixe la clé pour permettre une invalidation ciblée', () => {
    expect(creerFiltres().toCacheKey('stats:resume')).toMatch(/^stats:resume:/);
  });
});
