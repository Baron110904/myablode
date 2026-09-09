'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

/**
 * Leaflet manipule `window` dès l'import : la carte doit être chargée
 * uniquement côté navigateur, sans rendu serveur.
 */
export const CarteBenin = dynamic(() => import('./CarteBenin'), {
  ssr: false,
  loading: () => <SqueletteCarte />,
});

/**
 * Silhouette approximative du Bénin pendant le chargement de Leaflet.
 * Le regard sait immédiatement ce qui va apparaître, au lieu de fixer un
 * rectangle vide accompagné d'un texte.
 */
export function SqueletteCarte() {
  const t = useTranslations('carte');

  return (
    <div
      className="flex h-full min-h-[320px] w-full items-center justify-center bg-ablode-voile"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{t('chargement')}</span>
      <svg
        viewBox="0 0 60 120"
        className="h-4/5 max-h-[420px] w-auto animate-pulsation text-ablode-trait"
        aria-hidden
      >
        {/* Contour très simplifié : large au nord, étroit vers la côte. */}
        <path
          fill="currentColor"
          d="M18 4 L44 8 L46 30 L40 44 L42 62 L36 78 L38 96 L34 112 L22 114 L20 96 L24 78 L20 60 L16 42 L12 26 Z"
        />
      </svg>
    </div>
  );
}
