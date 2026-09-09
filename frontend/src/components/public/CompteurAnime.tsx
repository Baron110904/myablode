'use client';

import { useEffect, useRef, useState } from 'react';
import { useAnimationsReduites } from '@/hooks/useAnimationsReduites';
import { nombre, pourcentage } from '@/lib/format';

/**
 * Compte de zéro jusqu'à la valeur cible quand le chiffre entre à l'écran.
 *
 * Le rendu initial affiche déjà la valeur finale : l'animation est un
 * enrichissement, jamais une condition d'affichage. Sans JavaScript, avec des
 * animations réduites, ou avant tout défilement, le visiteur lit le bon
 * chiffre — pas un zéro.
 */
export function CompteurAnime({
  valeur,
  format = 'entier',
  duree = 1100,
}: {
  valeur: number;
  format?: 'entier' | 'pourcentage';
  duree?: number;
}) {
  const formater = (v: number) =>
    format === 'pourcentage' ? pourcentage(v) : nombre(Math.round(v));

  const [affichee, setAffichee] = useState(valeur);
  const reference = useRef<HTMLSpanElement | null>(null);
  const animationsReduites = useAnimationsReduites();

  useEffect(() => {
    const element = reference.current;

    if (
      animationsReduites ||
      valeur === 0 ||
      !element ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setAffichee(valeur);
      return;
    }

    // Déjà à l'écran au chargement : on laisse le chiffre en place plutôt que
    // de le faire clignoter à zéro sous les yeux du visiteur.
    const rect = element.getBoundingClientRect();
    const dejaVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (dejaVisible) {
      setAffichee(valeur);
      return;
    }

    setAffichee(0);
    let image = 0;

    const observateur = new IntersectionObserver(
      (entrees) => {
        if (!entrees[0]?.isIntersecting) return;
        observateur.disconnect();

        const debut = performance.now();
        const avancer = (maintenant: number) => {
          const progression = Math.min(1, (maintenant - debut) / duree);
          // Sortie cubique : départ franc, arrivée douce sur le chiffre exact.
          const adouci = 1 - Math.pow(1 - progression, 3);
          setAffichee(valeur * adouci);
          if (progression < 1) image = requestAnimationFrame(avancer);
        };
        image = requestAnimationFrame(avancer);
      },
      { threshold: 0.4 },
    );

    observateur.observe(element);

    return () => {
      observateur.disconnect();
      cancelAnimationFrame(image);
    };
  }, [valeur, duree, animationsReduites]);

  return (
    <span ref={reference} aria-label={formater(valeur)}>
      <span aria-hidden>{formater(affichee)}</span>
    </span>
  );
}
