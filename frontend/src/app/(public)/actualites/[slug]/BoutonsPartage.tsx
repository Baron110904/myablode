'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

/** Partage social de l'article (section 3.1.3 « Détail d'un article »). */
export function BoutonsPartage({ titre }: { titre: string }) {
  const t = useTranslations('actualites');
  const [copie, setCopie] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const liens = [
    {
      nom: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      nom: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(titre)}&url=${encodeURIComponent(url)}`,
    },
    {
      nom: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${titre} ${url}`)}`,
    },
    {
      nom: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : on ne bloque pas l'UI.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="etiquette">{t('partager')}</span>

      {liens.map((lien) => (
        <a
          key={lien.nom}
          href={lien.href}
          target="_blank"
          rel="noopener noreferrer"
          className="puce-filtre"
        >
          {lien.nom}
        </a>
      ))}

      <button type="button" onClick={copierLien} className="puce-filtre">
        {copie ? '✓ Copié' : 'Copier le lien'}
      </button>
    </div>
  );
}
