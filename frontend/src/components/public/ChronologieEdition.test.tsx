import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Evenement } from '@/lib/types';
import { ChronologieEdition, EncartGrandesDates } from './ChronologieEdition';

/**
 * Le bandeau des rendez-vous, sous le bandeau de tête.
 *
 * Deux exigences s'y croisent. La grille doit suivre le nombre réel de
 * dates - figée à quatre colonnes, elle laissait une cellule blanche à
 * droite dès qu'il y en avait trois. Et les filets de séparation doivent
 * suivre les mêmes paliers : horizontaux quand les dates s'empilent,
 * verticaux quand elles s'alignent, jamais les deux.
 */
const AUJOURDHUI = '2026-11-05';

function fabriquer(nombre: number, mois = 11): Evenement[] {
  return Array.from({ length: nombre }, (_, index) => ({
    id: index + 1,
    titre: `Date ${index + 1}`,
    sous_titre: null,
    date_debut: `2026-${String(mois).padStart(2, '0')}-${String(10 + index).padStart(2, '0')}`,
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
  });

  it('laisse une date seule occuper toute la largeur', () => {
    render(<ChronologieEdition evenements={fabriquer(1)} aujourdhui={AUJOURDHUI} />);
    expect(liste().className).not.toContain('grid-cols-');
  });

  it('n’affiche jamais plus de quatre dates', () => {
    render(<ChronologieEdition evenements={fabriquer(7)} aujourdhui={AUJOURDHUI} />);
    expect(liste().querySelectorAll('li')).toHaveLength(4);
  });

  it('disparaît quand le programme est vide', () => {
    const { container } = render(
      <ChronologieEdition evenements={[]} aujourdhui={AUJOURDHUI} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ChronologieEdition - filets de séparation', () => {
  /*
   * Un `border-t` laissé en place quand les colonnes s'alignent dessine un
   * trait en l'air au-dessus de chaque cellule. Chaque palier doit donc
   * annuler celui d'avant.
   */
  it('annule le filet horizontal là où le vertical prend le relais', () => {
    render(<ChronologieEdition evenements={fabriquer(3)} aujourdhui={AUJOURDHUI} />);
    for (const cellule of [...liste().querySelectorAll('li')].slice(1)) {
      expect(cellule.className).toContain('[&:not(:first-child)]:border-t');
      expect(cellule.className).toContain('lg:[&:not(:first-child)]:border-t-0');
      expect(cellule.className).toContain('lg:[&:not(:first-child)]:border-l');
    }
  });

  it('ne sépare rien quand il n’y a qu’une date', () => {
    render(<ChronologieEdition evenements={fabriquer(1)} aujourdhui={AUJOURDHUI} />);
    expect(liste().querySelector('li')?.className).not.toContain('border-t');
  });
});

describe('ChronologieEdition - mise en avant et quantièmes', () => {
  it('compose le quantième seul, en gros', () => {
    render(<ChronologieEdition evenements={fabriquer(2)} aujourdhui={AUJOURDHUI} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  /*
   * Le prochain rendez-vous doit se détacher, pas seulement celui qui se
   * tient aujourd'hui : un programme entièrement à venir n'avait rien de mis
   * en avant, alors que c'est justement la date que l'on cherche.
   */
  it('met en avant le prochain rendez-vous, même s’il n’est pas aujourd’hui', () => {
    render(<ChronologieEdition evenements={fabriquer(3)} aujourdhui={AUJOURDHUI} />);
    const cellules = [...liste().querySelectorAll('li')];
    expect(cellules[0].className).toContain('bg-white/[0.07]');
    expect(cellules[1].className).not.toContain('bg-white/[0.07]');
  });

  /*
   * Tant que le programme tient dans un mois, « 14 » se situe tout seul.
   * Dès qu'il l'enjambe, « 10 » et « 10 » ne veulent plus rien dire l'un
   * sans l'autre.
   */
  it('rappelle le mois seulement quand le programme en enjambe plusieurs', () => {
    const { unmount } = render(
      <ChronologieEdition evenements={fabriquer(2)} aujourdhui={AUJOURDHUI} />,
    );
    expect(screen.queryByText('nov.')).not.toBeInTheDocument();
    unmount();

    const deuxMois = [...fabriquer(1, 11), ...fabriquer(1, 12)].map((e, i) => ({
      ...e,
      id: i + 1,
    }));
    render(<ChronologieEdition evenements={deuxMois} aujourdhui={AUJOURDHUI} />);
    expect(screen.getByText('nov.')).toBeInTheDocument();
    expect(screen.getByText('déc.')).toBeInTheDocument();
  });
});

describe('EncartGrandesDates - même borne que le bandeau', () => {
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
