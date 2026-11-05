import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Evenement } from '@/lib/types';
import { ChronologieEdition, EncartGrandesDates } from './ChronologieEdition';

/**
 * Le bandeau de programme de l'accueil.
 *
 * Il était figé à quatre colonnes : avec trois dates, la quatrième cellule
 * restait blanche et vide à droite, et la carte paraissait tronquée. Les
 * colonnes suivent désormais le nombre de dates, et les filets verticaux
 * doivent suivre les mêmes paliers - sinon trois dates empilées sur
 * téléphone héritent d'un trait à gauche qui ne sépare rien.
 */
const AUJOURDHUI = '2026-11-05';

function fabriquer(nombre: number): Evenement[] {
  return Array.from({ length: nombre }, (_, index) => ({
    id: index + 1,
    titre: `Date ${index + 1}`,
    sous_titre: null,
    date_debut: `2026-11-${String(10 + index).padStart(2, '0')}`,
    date_fin: null,
    lieu: null,
    description: `Description ${index + 1}`,
    edition: '6ᵉ édition',
    publie: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: null,
  })) as unknown as Evenement[];
}

function liste(): HTMLElement {
  return document.querySelector('ol') as HTMLElement;
}

describe('ChronologieEdition - colonnes selon le nombre de dates', () => {
  it('occupe toute la largeur avec trois dates, sans cellule vide', () => {
    render(<ChronologieEdition evenements={fabriquer(3)} aujourdhui={AUJOURDHUI} />);
    const ol = liste();
    expect(ol.className).toContain('lg:grid-cols-3');
    expect(ol.className).not.toContain('lg:grid-cols-4');
    expect(ol.querySelectorAll('li')).toHaveLength(3);
  });

  it('garde quatre colonnes quand les quatre dates sont là', () => {
    render(<ChronologieEdition evenements={fabriquer(4)} aujourdhui={AUJOURDHUI} />);
    expect(liste().className).toContain('lg:grid-cols-4');
    expect(liste().className).toContain('sm:grid-cols-2');
  });

  it('passe à deux colonnes pour deux dates', () => {
    render(<ChronologieEdition evenements={fabriquer(2)} aujourdhui={AUJOURDHUI} />);
    const ol = liste();
    expect(ol.className).toContain('sm:grid-cols-2');
    expect(ol.className).not.toContain('lg:grid-cols-3');
    expect(ol.className).not.toContain('lg:grid-cols-4');
  });

  it('laisse une date seule occuper la carte entière', () => {
    render(<ChronologieEdition evenements={fabriquer(1)} aujourdhui={AUJOURDHUI} />);
    expect(liste().className).not.toContain('grid-cols-');
  });

  /*
   * Trois dates ne passent jamais par deux colonnes : un 2 + 1 rouvrirait sur
   * tablette le trou que l'on vient de fermer sur grand écran.
   */
  it('n’introduit pas d’étape à deux colonnes pour trois dates', () => {
    render(<ChronologieEdition evenements={fabriquer(3)} aujourdhui={AUJOURDHUI} />);
    expect(liste().className).not.toContain('sm:grid-cols-2');
  });

  it('accorde les filets verticaux à la grille', () => {
    render(<ChronologieEdition evenements={fabriquer(3)} aujourdhui={AUJOURDHUI} />);
    for (const cellule of liste().querySelectorAll('li')) {
      // Le filet n'apparaît qu'à partir de `lg`, là où les trois colonnes
      // existent vraiment.
      expect(cellule.className).toContain('lg:[&:not(:first-child)]:border-l');
      expect(cellule.className).not.toContain('sm:[&:not(:nth-child(2n+1))]:border-l');
    }
  });

  it('n’affiche jamais plus de quatre dates', () => {
    render(<ChronologieEdition evenements={fabriquer(7)} aujourdhui={AUJOURDHUI} />);
    expect(liste().querySelectorAll('li')).toHaveLength(4);
    expect(liste().className).toContain('lg:grid-cols-4');
  });

  it('disparaît quand le programme est vide', () => {
    const { container } = render(
      <ChronologieEdition evenements={[]} aujourdhui={AUJOURDHUI} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EncartGrandesDates - même borne que la chronologie', () => {
  it('suit le nombre réel de dates', () => {
    render(<EncartGrandesDates evenements={fabriquer(3)} edition="6ᵉ édition" />);
    expect(liste().className).toContain('lg:grid-cols-3');
    expect(liste().querySelectorAll('li')).toHaveLength(3);
  });

  /*
   * Les deux blocs racontent le même programme : l'un ne peut pas en montrer
   * une de plus que l'autre.
   */
  it('s’arrête lui aussi à quatre', () => {
    render(<EncartGrandesDates evenements={fabriquer(7)} edition="6ᵉ édition" />);
    expect(liste().querySelectorAll('li')).toHaveLength(4);
  });

  it('reprend le libellé d’édition dans son titre', () => {
    render(<EncartGrandesDates evenements={fabriquer(2)} edition="6ᵉ édition" />);
    expect(screen.getByText(/Les grandes dates de la 6ᵉ édition/)).toBeInTheDocument();
  });

  it('se passe du libellé quand il n’y en a pas', () => {
    render(<EncartGrandesDates evenements={fabriquer(2)} edition={null} />);
    expect(screen.getByText('Les grandes dates')).toBeInTheDocument();
  });
});
