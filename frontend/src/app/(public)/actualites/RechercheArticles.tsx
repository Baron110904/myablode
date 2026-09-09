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
    <form onSubmit={soumettre} role="search" className="flex gap-2">
      <label htmlFor="recherche-articles" className="sr-only">
        {t('rechercher')}
      </label>
      <input
        id="recherche-articles"
        type="search"
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder={t('rechercher')}
        className="champ w-full py-2 text-sm sm:w-64"
      />
      <button type="submit" className="puce-filtre shrink-0">
        OK
      </button>
    </form>
  );
}
