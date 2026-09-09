'use client';

import { useEffect, useState } from 'react';

/**
 * Indique si le système demande de limiter les animations.
 *
 * Les mouvements déclenchent des troubles vestibulaires chez certaines
 * personnes ; toute animation de ce projet doit pouvoir être neutralisée.
 * Renvoie `false` au premier rendu serveur, puis la vraie valeur.
 */
export function useAnimationsReduites(): boolean {
  const [reduites, setReduites] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduites(requete.matches);

    const surChangement = (evenement: MediaQueryListEvent) =>
      setReduites(evenement.matches);
    requete.addEventListener('change', surChangement);
    return () => requete.removeEventListener('change', surChangement);
  }, []);

  return reduites;
}
