import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeconsPrevention } from './LeconsPrevention';

/**
 * Les cinq leçons, en cartes qui défilent.
 *
 * Ce qui est vérifié ici n'est pas l'animation - une transition CSS ne se
 * teste pas en jsdom - mais ce dont elle dépend : que le défilement tourne,
 * qu'il s'arrête quand le visiteur s'en occupe, et qu'une seule carte à la
 * fois soit exposée aux lecteurs d'écran.
 */
const DELAI_MS = 4500;

function reglerPreferenceMouvement(reduit: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduit && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

const selectionne = () =>
  screen.getByRole('tab', { selected: true }).textContent?.replace(/^\d/, '').trim();

describe('LeconsPrevention', () => {
  beforeEach(() => {
    reglerPreferenceMouvement(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('présente les cinq leçons de l’association', () => {
    render(<LeconsPrevention />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(
      screen.getByRole('heading', { name: /Les 5 leçons pour éviter le diabète/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/pas trop gras, pas trop salé/)).toBeInTheDocument();
    expect(screen.getByText(/35 à 45 minutes/)).toBeInTheDocument();
  });

  it('passe d’elle-même à la leçon suivante, puis revient à la première', () => {
    render(<LeconsPrevention />);
    expect(selectionne()).toBe('Manger sain et équilibré');

    act(() => void vi.advanceTimersByTime(DELAI_MS));
    expect(selectionne()).toBe('Préférer l’eau');

    // Quatre tours de plus : la boucle doit se refermer, pas s'arrêter au bout.
    act(() => void vi.advanceTimersByTime(DELAI_MS * 4));
    expect(selectionne()).toBe('Manger sain et équilibré');
  });

  /*
   * WCAG 2.2.2 : un contenu qui bouge seul plus de cinq secondes doit pouvoir
   * être arrêté. La liste tient ce rôle - et surtout, choisir une leçon pour
   * la lire ne doit pas être suivi d'un changement de carte trois secondes
   * plus tard.
   */
  it('cesse de tourner dès qu’une leçon est choisie', () => {
    render(<LeconsPrevention />);

    fireEvent.click(screen.getByRole('tab', { name: /Se faire dépister/ }));
    expect(selectionne()).toBe('Se faire dépister chaque année');

    act(() => void vi.advanceTimersByTime(DELAI_MS * 3));
    expect(selectionne()).toBe('Se faire dépister chaque année');
  });

  it('ne démarre pas si le système demande à réduire les animations', () => {
    reglerPreferenceMouvement(true);
    render(<LeconsPrevention />);

    act(() => void vi.advanceTimersByTime(DELAI_MS * 3));
    expect(selectionne()).toBe('Manger sain et équilibré');
  });

  /*
   * Les cinq cartes sont dans le document en permanence, empilées. Sans
   * `aria-hidden`, un lecteur d'écran lirait les cinq leçons à la suite comme
   * si elles étaient toutes affichées.
   */
  it('n’expose qu’une carte à la fois', () => {
    render(<LeconsPrevention />);
    const panneaux = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panneaux).toHaveLength(5);
    expect(panneaux.filter((p) => p.getAttribute('aria-hidden') === 'false')).toHaveLength(1);

    act(() => void vi.advanceTimersByTime(DELAI_MS));
    const apres = screen.getAllByRole('tabpanel', { hidden: true });
    expect(apres.filter((p) => p.getAttribute('aria-hidden') === 'false')).toHaveLength(1);
  });

  it('relie chaque commande à sa carte', () => {
    render(<LeconsPrevention />);
    for (const onglet of screen.getAllByRole('tab')) {
      const carte = document.getElementById(onglet.getAttribute('aria-controls') ?? '');
      expect(carte).not.toBeNull();
      expect(carte?.getAttribute('aria-labelledby')).toBe(onglet.id);
    }
  });
});

/*
 * L'eventail : la carte de devant est droite, celles du dessous sont
 * inclinees d'un cran de plus chacune. Mesure prise sur la maquette - la
 * carte de devant y est a 0,00 degre.
 */
describe('LeconsPrevention - empilement en éventail', () => {
  beforeEach(() => reglerPreferenceMouvement(false));

  it('laisse la carte de devant droite et incline celles du dessous', () => {
    render(<LeconsPrevention />);
    const cartes = screen.getAllByRole('tabpanel', { hidden: true });

    const devant = cartes.find((c) => c.getAttribute('aria-hidden') === 'false');
    expect(devant?.style.transform).toContain('rotate(0deg)');

    // Au moins une carte derrière porte une inclinaison, sinon la pile se lit
    // comme un simple décalage.
    const inclinees = cartes.filter(
      (c) => /rotate\((?!0deg)[\d.]+deg\)/.test(c.style.transform),
    );
    expect(inclinees.length).toBeGreaterThan(0);
  });
});
