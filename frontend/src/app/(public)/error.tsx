'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function ErreurPublique({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('erreurs');
  const tc = useTranslations('commun');

  useEffect(() => {
    // Remonte l'erreur au monitoring (Sentry dans les contraintes budgétaires).
    console.error('Erreur de rendu :', error);
  }, [error]);

  return (
    <div className="conteneur flex min-h-[60vh] items-center py-20">
      <div className="max-w-lg">
        <p className="font-mono text-etiquette uppercase text-ablode-alerte">Erreur</p>
        <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-[-0.02em]">
          {t('titre500')}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ablode-gris">
          {t('texte500')}
        </p>
        <button type="button" onClick={reset} className="bouton-principal mt-8">
          {tc('reessayer')}
        </button>
      </div>
    </div>
  );
}
