import {
  calculerImc,
  BORNES_VRAISEMBLANCE,
  motifHorsNorme,
  normaliserBooleen,
  normaliserDate,
  normaliserGlycemie,
  normaliserNombre,
  normaliserSexe,
  normaliserTexte,
  normaliserType,
  sansAccents,
} from './normalisation';
import { DepistageType, Sexe } from 'src/database/entities';

describe('normaliserSexe', () => {
  it.each([
    ['F', Sexe.F],
    ['f', Sexe.F],
    ['Féminin', Sexe.F],
    ['feminin', Sexe.F],
    ['FEMME', Sexe.F],
    ['female', Sexe.F],
    ['2', Sexe.F],
    // Codes produits par Kobo : le « é » de « Féminin » devient un souligné.
    ['f_minin', Sexe.F],
    ['F_MININ', Sexe.F],
    ['M', Sexe.M],
    ['Homme', Sexe.M],
    ['H', Sexe.M],
    ['masculin', Sexe.M],
    ['Masculin', Sexe.M],
    ['1', Sexe.M],
  ])('reconnaît « %s »', (entree, attendu) => {
    expect(normaliserSexe(entree)).toBe(attendu);
  });

  it('renvoie null pour une valeur non reconnue', () => {
    expect(normaliserSexe('inconnu')).toBeNull();
    expect(normaliserSexe('')).toBeNull();
    expect(normaliserSexe(null)).toBeNull();
    expect(normaliserSexe(undefined)).toBeNull();
  });
});

describe('normaliserDate', () => {
  it('accepte le format ISO', () => {
    expect(normaliserDate('2026-08-24')).toBe('2026-08-24');
    expect(normaliserDate('2026-08-24T10:30:00Z')).toBe('2026-08-24');
  });

  it('accepte le format français jour/mois/année', () => {
    expect(normaliserDate('24/08/2026')).toBe('2026-08-24');
    expect(normaliserDate('4/8/2026')).toBe('2026-08-04');
    expect(normaliserDate('24-08-2026')).toBe('2026-08-24');
  });

  it('convertit un numéro de série Excel', () => {
    // 45000 = 2023-03-15 dans le calendrier Excel (base 30/12/1899).
    expect(normaliserDate(45000)).toBe('2023-03-15');
  });

  it('accepte un objet Date', () => {
    expect(normaliserDate(new Date('2026-01-15T00:00:00Z'))).toBe('2026-01-15');
  });

  it('renvoie null pour une valeur illisible', () => {
    expect(normaliserDate('pas une date')).toBeNull();
    expect(normaliserDate('')).toBeNull();
    expect(normaliserDate(null)).toBeNull();
  });
});

describe('normaliserNombre', () => {
  it('accepte la virgule décimale', () => {
    expect(normaliserNombre('126,5')).toBe(126.5);
  });

  it('ignore les unités collées', () => {
    expect(normaliserNombre('126 mg/dL')).toBe(126);
  });

  it('renvoie null pour une valeur vide ou non numérique', () => {
    expect(normaliserNombre('')).toBeNull();
    expect(normaliserNombre('abc')).toBeNull();
    expect(normaliserNombre(null)).toBeNull();
  });
});

describe('normaliserGlycemie', () => {
  it('conserve une valeur déjà en mg/dL', () => {
    expect(normaliserGlycemie('126')).toBe(126);
    expect(normaliserGlycemie(95)).toBe(95);
  });

  it('convertit une saisie en g/L vers mg/dL', () => {
    // Unité des glucomètres francophones : 1,26 g/L = 126 mg/dL.
    expect(normaliserGlycemie('1,26')).toBe(126);
    expect(normaliserGlycemie('5.6')).toBe(560);
  });

  it('accepte une valeur aberrante sans la refuser', () => {
    // La collecte enregistre tout : la correction se fait au back-office.
    expect(normaliserGlycemie('1200')).toBe(1200);
  });
});

describe('normaliserBooleen', () => {
  it.each(['1', 'true', 'Oui', 'OUI', 'yes', 'X', true])(
    'considère « %s » comme vrai',
    (entree) => {
      expect(normaliserBooleen(entree)).toBe(true);
    },
  );

  it.each(['0', 'false', 'Non', '', null, undefined, false])(
    'considère « %s » comme faux',
    (entree) => {
      expect(normaliserBooleen(entree)).toBe(false);
    },
  );
});

describe('normaliserType', () => {
  it('reconnaît les libellés courants', () => {
    expect(normaliserType('Diabète')).toBe(DepistageType.DIABETE);
    expect(normaliserType('diabete')).toBe(DepistageType.DIABETE);
    expect(normaliserType('Obésité')).toBe(DepistageType.OBESITE);
    expect(normaliserType('Endocrinopathie')).toBe(DepistageType.ENDOCRINOPATHIE);
    expect(normaliserType('maladie des glandes')).toBe(
      DepistageType.ENDOCRINOPATHIE,
    );
  });

  it('reconnaît les codes produits par Kobo', () => {
    // « Diabète » et « Obésité » perdent leurs voyelles accentuées.
    expect(normaliserType('diab_te')).toBe(DepistageType.DIABETE);
    expect(normaliserType('ob_sit_')).toBe(DepistageType.OBESITE);
  });

  it('renvoie null si le type est inconnu', () => {
    expect(normaliserType('hypertension')).toBeNull();
  });
});

describe('sansAccents', () => {
  it('retire les diacritiques des noms de communes', () => {
    expect(sansAccents('Sèmè-Kpodji')).toBe('Seme-Kpodji');
    expect(sansAccents('Aguégués')).toBe('Aguegues');
    expect(sansAccents('Kétou')).toBe('Ketou');
  });
});

describe('normaliserTexte', () => {
  it('tronque à la longueur maximale', () => {
    expect(normaliserTexte('a'.repeat(200), 100)).toHaveLength(100);
  });

  it('renvoie null pour une chaîne vide', () => {
    expect(normaliserTexte('   ', 100)).toBeNull();
  });
});

/**
 * Le signalement ne refuse rien : la ligne est déjà acceptée quand le motif
 * s'écrit. Ces tests vérifient qu'il se déclenche au bon endroit et qu'il
 * reste muet sur les mesures ordinaires.
 */
describe('motifHorsNorme', () => {
  it('reste muet sur des mesures plausibles', () => {
    expect(motifHorsNorme(126, 24.5)).toBeNull();
    expect(motifHorsNorme(560, 32)).toBeNull();
    expect(motifHorsNorme(null, null)).toBeNull();
  });

  it('signale une glycémie hors du domaine physiologique', () => {
    const motif = motifHorsNorme(1200, null);
    expect(motif).toContain('glycémie 1200');
    expect(motif).toContain('20');
    expect(motif).toContain('900');
  });

  it('signale un IMC hors du domaine physiologique', () => {
    expect(motifHorsNorme(null, 150)).toContain('IMC 150');
    expect(motifHorsNorme(null, 3)).toContain('IMC 3');
  });

  it('cumule les deux motifs quand les deux mesures sortent', () => {
    const motif = motifHorsNorme(5, 200);
    expect(motif).toContain('glycémie');
    expect(motif).toContain('IMC');
  });

  it('tient dans la colonne prévue', () => {
    // La colonne accepte 160 caractères : un motif tronqué serait illisible.
    const pire = motifHorsNorme(999999, 999999);
    expect(pire).not.toBeNull();
    expect((pire as string).length).toBeLessThanOrEqual(160);
  });

  it('borne les valeurs aux limites incluses', () => {
    const g = BORNES_VRAISEMBLANCE.glycemie;
    expect(motifHorsNorme(g.min, null)).toBeNull();
    expect(motifHorsNorme(g.max, null)).toBeNull();
    expect(motifHorsNorme(g.min - 1, null)).not.toBeNull();
    expect(motifHorsNorme(g.max + 1, null)).not.toBeNull();
  });
});

describe('calculerImc', () => {
  it('applique poids / taille² avec la taille en centimètres', () => {
    expect(calculerImc(72, 168)).toBe(25.51);
    expect(calculerImc(95, 170)).toBe(32.87);
    expect(calculerImc(50, 160)).toBe(19.53);
  });

  it('ne conclut pas si une mesure manque', () => {
    expect(calculerImc(72, null)).toBeNull();
    expect(calculerImc(null, 168)).toBeNull();
    expect(calculerImc(null, null)).toBeNull();
  });

  /* Une taille nulle ferait une division par zéro, donc un IMC infini. */
  it('ne divise pas par une taille nulle', () => {
    expect(calculerImc(72, 0)).toBeNull();
    expect(calculerImc(72, -10)).toBeNull();
  });

  it('n’applique aucune borne : une mesure aberrante donne un IMC aberrant', () => {
    // 300 kg pour 150 cm : implausible, mais c'est motifHorsNorme qui le dit.
    expect(calculerImc(300, 150)).toBe(133.33);
  });
});

describe('motifHorsNorme — poids et taille', () => {
  it('signale un poids hors des bornes', () => {
    expect(motifHorsNorme(null, null, 500, 170)).toContain('poids 500 kg');
    expect(motifHorsNorme(null, null, 1, 170)).toContain('poids 1 kg');
  });

  it('signale une taille hors des bornes', () => {
    expect(motifHorsNorme(null, null, 70, 300)).toContain('taille 300 cm');
  });

  it('cumule les motifs', () => {
    const motif = motifHorsNorme(12, 200, 500, 300);
    expect(motif).toContain('glycémie');
    expect(motif).toContain('IMC');
    expect(motif).toContain('poids');
    expect(motif).toContain('taille');
  });

  it('ne signale rien dans les bornes', () => {
    expect(motifHorsNorme(95, 24, 72, 168)).toBeNull();
  });
});
