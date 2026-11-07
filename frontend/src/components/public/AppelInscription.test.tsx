import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FormulaireMarchePublic } from '@/lib/types';
import { adresseExterneSure, AppelInscription } from './AppelInscription';

/**
 * L'appel à s'inscrire, dans l'article de la marche.
 *
 * Deux portes possibles, jamais les deux : le bulletin du site, ou une
 * adresse externe. Publier les deux produirait deux listes de participants,
 * et personne ne saurait laquelle fait foi.
 */
function formulaire(sur: Partial<FormulaireMarchePublic> = {}): FormulaireMarchePublic {
  return {
    id: 1,
    titre: 'Marche « Sucre à terre »',
    introduction: null,
    dateFermeture: null,
    messageFerme: null,
    ouvert: true,
    inscrits: 0,
    dateEvenement: null,
    lieu: null,
    parcours: null,
    surPlace: null,
    aPrevoir: [],
    lienExterne: null,
    ...sur,
  };
}

describe('AppelInscription', () => {
  it('mène au bulletin du site quand aucun lien n’est posé', () => {
    render(<AppelInscription formulaire={formulaire()} slug="marche-2026" />);
    const bouton = screen.getByRole('link', { name: /Je m’inscris/ });
    expect(bouton).toHaveAttribute('href', '/actualites/marche-2026/inscription');
    expect(bouton).not.toHaveAttribute('target');
  });

  it('mène à l’adresse externe dès qu’elle est renseignée', () => {
    render(
      <AppelInscription
        formulaire={formulaire({ lienExterne: 'https://exemple.org/inscription' })}
        slug="marche-2026"
      />,
    );
    const bouton = screen.getByRole('link', { name: /Je m’inscris/ });
    expect(bouton).toHaveAttribute('href', 'https://exemple.org/inscription');
  });

  /*
   * `rel="noopener"` n'est pas décoratif : sans lui, la page ouverte peut
   * reprendre la main sur l'onglet d'origine via `window.opener`.
   */
  it('ouvre le lien externe sans exposer l’onglet d’origine', () => {
    render(
      <AppelInscription
        formulaire={formulaire({ lienExterne: 'https://exemple.org/inscription' })}
        slug="marche-2026"
      />,
    );
    const bouton = screen.getByRole('link', { name: /Je m’inscris/ });
    expect(bouton).toHaveAttribute('target', '_blank');
    expect(bouton.getAttribute('rel')).toContain('noopener');
    // Une fenêtre qui s'ouvre sans prévenir désoriente : on le dit.
    expect(bouton.textContent).toContain('nouvelle fenêtre');
  });

  /*
   * Le décompte ne vaut que pour le bulletin du site. Affiché à côté d'un
   * lien externe, il annoncerait un total faux.
   */
  it('tait le nombre d’inscrits quand les inscriptions se font ailleurs', () => {
    const { unmount } = render(
      <AppelInscription formulaire={formulaire({ inscrits: 12 })} slug="m" />,
    );
    expect(screen.getByText(/12 personnes déjà inscrites/)).toBeInTheDocument();
    unmount();

    render(
      <AppelInscription
        formulaire={formulaire({ inscrits: 12, lienExterne: 'https://exemple.org' })}
        slug="m"
      />,
    );
    expect(screen.queryByText(/12 personnes/)).not.toBeInTheDocument();
  });

  it('annonce la clôture plutôt que de disparaître', () => {
    render(
      <AppelInscription
        formulaire={formulaire({
          ouvert: false,
          lienExterne: 'https://exemple.org',
          messageFerme: 'Rendez-vous l’an prochain.',
        })}
        slug="m"
      />,
    );
    expect(screen.queryByRole('link', { name: /Je m’inscris/ })).not.toBeInTheDocument();
    expect(screen.getByText('Rendez-vous l’an prochain.')).toBeInTheDocument();
  });
});

/*
 * Le lien externe finit en `href` sur une page publique. Le back-office le
 * valide deja a la saisie ; ce second filtre existe parce que la valeur
 * traverse la base, l'API et le cache avant d'arriver la, et qu'une voie
 * d'ecriture future - import, correctif en base - ne passerait pas par le
 * meme controle.
 */
describe('adresseExterneSure', () => {
  it('laisse passer http et https', () => {
    expect(adresseExterneSure('https://exemple.org/marche')).toBe(
      'https://exemple.org/marche',
    );
    expect(adresseExterneSure('http://exemple.org/marche')).toBe(
      'http://exemple.org/marche',
    );
  });

  it('refuse les protocoles exécutables, quelle que soit la casse', () => {
    for (const piege of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '  javascript:alert(1)  ',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(adresseExterneSure(piege)).toBeNull();
    }
  });

  it('refuse ce qui n’est pas une adresse absolue', () => {
    expect(adresseExterneSure('exemple.org/marche')).toBeNull();
    expect(adresseExterneSure('/actualites/marche')).toBeNull();
    expect(adresseExterneSure('')).toBeNull();
    expect(adresseExterneSure(null)).toBeNull();
  });
});

describe('AppelInscription - lien dangereux', () => {
  it('n’affiche aucun lien si l’adresse n’est pas http(s)', () => {
    render(
      <AppelInscription
        formulaire={formulaire({ lienExterne: 'javascript:alert(1)' })}
        slug="marche-2026"
      />,
    );
    // Le bulletin du site reprend la main : aucun lien exécutable n'est posé.
    const bouton = screen.getByRole('link', { name: /Je m’inscris/ });
    expect(bouton).toHaveAttribute('href', '/actualites/marche-2026/inscription');
  });
});
