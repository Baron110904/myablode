import { describe, expect, it } from 'vitest';
import { libelleNiveau, niveauPourZoom } from './niveau-carte';

describe('niveauPourZoom', () => {
  it('montre les départements quand on voit le pays entier', () => {
    expect(niveauPourZoom(5, 'departement')).toBe('departement');
    expect(niveauPourZoom(6.5, 'departement')).toBe('departement');
  });

  it('passe aux communes quand on approche franchement', () => {
    expect(niveauPourZoom(7.5, 'departement')).toBe('commune');
    expect(niveauPourZoom(10, 'departement')).toBe('commune');
  });

  it('revient aux départements en s’éloignant franchement', () => {
    expect(niveauPourZoom(7, 'commune')).toBe('departement');
    expect(niveauPourZoom(5, 'commune')).toBe('departement');
  });

  it('ne bascule pas dans la zone morte', () => {
    /*
     * Entre 7,1 et 7,5 chacun garde son découpage : c'est ce qui évite un
     * rechargement à chaque micro-ajustement du zoom autour du seuil.
     */
    expect(niveauPourZoom(7.2, 'departement')).toBe('departement');
    expect(niveauPourZoom(7.4, 'departement')).toBe('departement');
    expect(niveauPourZoom(7.2, 'commune')).toBe('commune');
    expect(niveauPourZoom(7.4, 'commune')).toBe('commune');
  });

  it('est stable : rejouer la décision ne change rien', () => {
    for (const zoom of [5, 6, 7, 7.2, 7.5, 8, 12]) {
      const premier = niveauPourZoom(zoom, 'departement');
      expect(niveauPourZoom(zoom, premier)).toBe(premier);
    }
  });
});

describe('libelleNiveau', () => {
  it('nomme le découpage au singulier', () => {
    expect(libelleNiveau('departement')).toBe('Département');
    expect(libelleNiveau('commune')).toBe('Commune');
  });
});
