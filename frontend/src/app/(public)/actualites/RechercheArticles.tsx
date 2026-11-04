'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/** Recherche plein texte dans les titres et contenus (section 3.1.3). */
export function RechercheArticles({ valeurInitiale }: { valeurInitiale: string }) {
  const t = useTranslations('actualites');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [terme, setTerme] = useState(valeurInitiale);

  function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    if (terme.trim()) {
      params.set('recherche', terme.trim());
    } else {
      params.delete('recherche');
    }
    // Une nouvelle recherche repart de la première page.
    params.delete('page');

    const query = params.toString();
    router.push(query ? `/actualites?${query}` : '/actualites');
  }

  return (
    <form onSubmit={soumettre} role="search">
      <label htmlFor="recherche-articles" className="sr-only">
        {t('rechercher')}
      </label>
      {/*
        Champ et bouton dans une même pilule blanche : la barre est posée sur
        le bandeau sombre, où un champ bordé disparaîtrait. L'anneau de focus
        est porté par le groupe, le champ étant transparent.
      */}
      <div className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-carte focus-within:ring-2 focus-within:ring-ablode-vert-clair">
        <input
          id="recherche-articles"
          type="search"
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder={t('rechercher')}
          className="w-full bg-transparent px-4 py-2 text-[0.9375rem] text-ablode-encre placeholder:text-ablode-gris focus:outline-none sm:w-64"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-ablode-nuit px-5 py-2 text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-ablode-encre"
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}
