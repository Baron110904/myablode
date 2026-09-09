import type { Metadata } from 'next';
import { VueCarte } from './VueCarte';

export const metadata: Metadata = {
  title: 'Carte du dépistage',
  description:
    'Carte interactive des 77 communes du Bénin colorées selon le taux de ' +
    'prévalence du diabète et de l’obésité relevé lors des dépistages de l’ABLODE.',
};

export default function PageCarte() {
  return <VueCarte />;
}
