import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { ChiffresCles } from './ChiffresCles';
import messages from '@/messages/fr.json';
import type { ResumeStats } from '@/lib/types';

const RESUME: ResumeStats = {
  totalDepistages: 35233,
  casDetectes: 542,
  preDiabete: 1399,
  orientesCentre: 862,
  communesCouvertes: 77,
  totalCommunes: 77,
  campagnesRealisees: 26,
  tauxPrevalence: 1.5,
  variationDepistages7j: 128,
  variationCas7j: 9,
};

function rendre(props: Parameters<typeof ChiffresCles>[0]) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ChiffresCles {...props} />
    </NextIntlClientProvider>,
  );
}

describe('ChiffresCles', () => {
  it('affiche les quatre indicateurs clés', () => {
    rendre({ resume: RESUME });

    expect(screen.getByText(/35\s?233/)).toBeInTheDocument();
    expect(screen.getByText('542')).toBeInTheDocument();
    expect(screen.getByText('1,5 %')).toBeInTheDocument();
    expect(screen.getByText('Dépistages réalisés')).toBeInTheDocument();
    expect(screen.getByText('Cas détectés')).toBeInTheDocument();
    expect(screen.getByText('Communes couvertes')).toBeInTheDocument();
    expect(screen.getByText('Taux de prévalence')).toBeInTheDocument();
  });

  it('masque les variations par défaut', () => {
    rendre({ resume: RESUME });
    expect(screen.queryByText(/\+128/)).not.toBeInTheDocument();
  });

  it('affiche les variations hebdomadaires quand demandé', () => {
    rendre({ resume: RESUME, avecVariations: true });
    expect(screen.getByText(/\+128/)).toBeInTheDocument();
    expect(screen.getByText(/\+9/)).toBeInTheDocument();
    expect(screen.getByText(/sur 77/)).toBeInTheDocument();
  });

  it('reste lisible avec des compteurs à zéro', () => {
    const vide: ResumeStats = { ...RESUME, totalDepistages: 0, casDetectes: 0, tauxPrevalence: 0 };
    rendre({ resume: vide });

    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0,0 %')).toBeInTheDocument();
  });

  it('utilise une liste de définitions pour la sémantique', () => {
    const { container } = rendre({ resume: RESUME });
    expect(container.querySelector('dl')).toBeInTheDocument();
    expect(container.querySelectorAll('dt')).toHaveLength(4);
    expect(container.querySelectorAll('dd')).toHaveLength(4);
  });
});
