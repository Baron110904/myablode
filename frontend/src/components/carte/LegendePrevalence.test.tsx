import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { LegendePrevalence } from './LegendePrevalence';
import messages from '@/messages/fr.json';

function rendre(props: Parameters<typeof LegendePrevalence>[0] = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LegendePrevalence {...props} />
    </NextIntlClientProvider>,
  );
}

describe('LegendePrevalence', () => {
  it('affiche les cinq paliers de la maquette', () => {
    rendre();

    expect(screen.getByText('< 3 %')).toBeInTheDocument();
    expect(screen.getByText('3 – 5 %')).toBeInTheDocument();
    expect(screen.getByText('5 – 8 %')).toBeInTheDocument();
    expect(screen.getByText('8 – 11 %')).toBeInTheDocument();
    expect(screen.getByText('> 11 %')).toBeInTheDocument();
  });

  it('affiche le titre traduit', () => {
    rendre();
    expect(screen.getByText('Prévalence')).toBeInTheDocument();
  });

  it('peut masquer le titre', () => {
    rendre({ avecTitre: false });
    expect(screen.queryByText('Prévalence')).not.toBeInTheDocument();
  });

  it('marque les pastilles de couleur comme décoratives', () => {
    const { container } = rendre();
    const pastilles = container.querySelectorAll('[aria-hidden="true"]');
    expect(pastilles).toHaveLength(5);
  });
});
