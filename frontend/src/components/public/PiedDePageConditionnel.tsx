'use client';

import { usePathname } from 'next/navigation';
import { PiedDePage } from './PiedDePage';

/**
 * Pages où le pied de page est retiré.
 *
 * La carte occupe toute la hauteur de la fenêtre et se manipule au défilement :
 * un pied de page en dessous n'apporte rien et donne l'impression fausse que
 * la page continue.
 */
const SANS_PIED = ['/carte'];

export function PiedDePageConditionnel() {
  const chemin = usePathname();
  if (SANS_PIED.includes(chemin)) return null;
  return <PiedDePage />;
}
