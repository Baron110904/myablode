'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Flux des dépistages qui arrivent, pour le site public.
 *
 * Ce que le visiteur voit : une commune et une heure. Rien d'autre. Ni
 * résultat, ni mesure — dans une commune peu peuplée, « un cas de diabète
 * vient d'être détecté à X » désignerait une personne. Le signalement seul
 * montre que la collecte vit sans dire ce qu'elle a trouvé.
 *
 * Et rien n'est inventé : seules les arrivées apparues depuis l'ouverture de
 * la page s'affichent. Le premier chargement sert de point de référence, il ne
 * rejoue pas l'historique.
 */
export interface Arrivee {
  id: number;
  commune: string;
  lat: number | null;
  lng: number | null;
  horodatage: string;
  /** Heure d'affichage, figée au moment de la réception. */
  recuA: number;
}

const INTERVALLE = 15_000;
const DUREE_ONDE = 1_800;
/** Une arrivée reste visible cinq minutes, puis quitte la liste. */
const DUREE_VISIBLE = 300_000;

export function useFluxEntrant(actif = true): {
  arrivees: Arrivee[];
  ondes: Array<{ cle: string; lat: number; lng: number }>;
} {
  const [arrivees, setArrivees] = useState<Arrivee[]>([]);
  const [ondes, setOndes] = useState<Array<{ cle: string; lat: number; lng: number }>>(
    [],
  );

  const vus = useRef<Set<number>>(new Set());
  const amorce = useRef(true);
  const compteur = useRef(0);

  useEffect(() => {
    if (!actif) return;

    let annule = false;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    async function interroger() {
      try {
        const reponse = await fetch(`${base}/api/stats/derniers`, { cache: 'no-store' });
        if (!reponse.ok || annule) return;

        const recus: Array<Omit<Arrivee, 'recuA'>> = await reponse.json();
        const nouveaux = recus.filter((a) => !vus.current.has(a.id));
        recus.forEach((a) => vus.current.add(a.id));

        if (amorce.current) {
          amorce.current = false;
          return;
        }
        if (nouveaux.length === 0) return;

        const maintenant = Date.now();
        setArrivees((courantes) =>
          [
            ...nouveaux.map((a) => ({ ...a, recuA: maintenant })),
            ...courantes,
          ].slice(0, 8),
        );

        // Les arrivées sont espacées : six ondes simultanées ne se lisent pas.
        nouveaux.slice(0, 6).forEach((arrivee, rang) => {
          if (arrivee.lat === null || arrivee.lng === null) return;
          window.setTimeout(() => {
            if (annule) return;
            const cle = `${arrivee.id}-${(compteur.current += 1)}`;
            setOndes((c) => [
              ...c,
              { cle, lat: arrivee.lat as number, lng: arrivee.lng as number },
            ]);
            window.setTimeout(
              () => setOndes((c) => c.filter((o) => o.cle !== cle)),
              DUREE_ONDE,
            );
          }, rang * 700);
        });
      } catch {
        // Réseau indisponible : la page reste lisible, sans flux.
      }
    }

    const minuteur = window.setInterval(interroger, INTERVALLE);
    void interroger();

    // Purge des arrivées trop anciennes, pour que la liste ne fige pas.
    const menage = window.setInterval(() => {
      const limite = Date.now() - DUREE_VISIBLE;
      setArrivees((courantes) => courantes.filter((a) => a.recuA > limite));
    }, 30_000);

    return () => {
      annule = true;
      window.clearInterval(minuteur);
      window.clearInterval(menage);
    };
  }, [actif]);

  return { arrivees, ondes };
}

/**
 * Encadré du flux entrant. Ne rend rien tant que rien n'est arrivé : un
 * encadré vide qui annonce un direct sans direct vaut moins que pas
 * d'encadré du tout.
 */
export function EncadreFlux({
  arrivees,
  className = '',
}: {
  arrivees: Arrivee[];
  className?: string;
}) {
  if (arrivees.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      className={`rounded-carte border border-ablode-trait bg-white/95 shadow-carte backdrop-blur-sm ${className}`}
    >
      <p className="flex items-center gap-2.5 border-b border-ablode-trait px-5 py-3">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 animate-battement rounded-full bg-ablode-vert"
        />
        <span className="text-[0.8125rem] font-semibold">Dépistages en cours</span>
      </p>
      <ul className="divide-y divide-ablode-trait">
        {arrivees.slice(0, 5).map((arrivee) => (
          <li
            key={arrivee.id}
            className="flex animate-entree-flux items-center justify-between gap-4 px-5 py-2.5"
          >
            <span className="truncate text-[0.8125rem] font-semibold">
              {arrivee.commune}
            </span>
            <span className="shrink-0 font-mono text-[0.75rem] tabular-nums text-ablode-gris">
              {heure(arrivee.horodatage)}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function heure(horodatage: string): string {
  const valeur = new Date(horodatage);
  if (Number.isNaN(valeur.getTime())) return '—';
  return valeur.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
