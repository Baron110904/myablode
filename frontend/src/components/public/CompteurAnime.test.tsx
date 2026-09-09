import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompteurAnime } from './CompteurAnime';

describe('CompteurAnime', () => {
  it('affiche la valeur finale dès le premier rendu', () => {
    // Le chiffre ne doit jamais dépendre du JavaScript : c'est une donnée de
    // santé publique, pas un effet décoratif.
    render(<CompteurAnime valeur={11732} />);
    expect(screen.getByText(/11.732/)).toBeInTheDocument();
  });

  it('formate un pourcentage à la française', () => {
    render(<CompteurAnime valeur={7.3} format="pourcentage" />);
    expect(screen.getByText('7,3 %')).toBeInTheDocument();
  });

  it('annonce la valeur finale aux lecteurs d’écran', () => {
    const { container } = render(<CompteurAnime valeur={542} />);
    const annonce = container.querySelector('[aria-label]');

    expect(annonce).toHaveAttribute('aria-label', '542');
    // Le décompte visuel ne doit pas être relu à chaque image.
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('gère la valeur zéro sans erreur', () => {
    render(<CompteurAnime valeur={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
