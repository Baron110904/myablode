import type { Metadata } from 'next';
import { VueResultats } from './VueResultats';

export const metadata: Metadata = {
  alternates: { canonical: '/resultats' },
  openGraph: { url: '/resultats' },
  title: 'Résultats & statistiques',
  description:
    'Statistiques agrégées et anonymisées des campagnes de dépistage du ' +
    'diabète et de l’obésité menées par l’ABLODE au Bénin.',
};

export default function PageResultats() {
  return <VueResultats />;
}
