'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CarteBenin } from './CarteDynamique';
import type { CarteGeoJson } from '@/lib/types';

/** Dépistage tel que le site public a le droit de le connaître. */
export interface SignalDepistage {
  id: number;
  commune: string;
  commune_id: number;
  lat: number | null;
  lng: number | null;
  horodatage: string;
}

/** Onde en cours de diffusion, en coordonnées géographiques. */
interface Onde {
  cle: string;
  lat: number;
  lng: number;
}

/** Pays voisins : le nom, posé près de sa frontière. */
const VOISINS = [
  { nom: 'Niger', x: 88, y: 9 },
  { nom: 'Burkina Faso', x: 9, y: 15 },
  { nom: 'Nigeria', x: 90, y: 47 },
  { nom: 'Togo', x: 8, y: 52 },
  { nom: 'Ghana', x: 5, y: 74 },
];

const INTERVALLE_INTERROGATION = 15_000;
const DUREE_ONDE = 1_800;
/** Au-delà, « Dépistage en cours » ne serait plus vrai. */
const DUREE_EVEIL = 60_000;

/**
 * Carte du bandeau d'accueil, animée par l'activité réelle du terrain.
 *
 * Le principe : **aucune onde n'est inventée**. Le composant interroge l'API
 * toutes les quinze secondes ; chaque dépistage qui n'était pas là au tour
 * précédent fait réagir sa commune. Quand rien n'arrive, la carte reste nue —
 * ni onde, ni bandeau, ni compteur qui bouge.
 *
 * Le premier chargement ne rejoue pas l'historique : il servirait de faux
 * direct. Il sert uniquement de point de référence pour la suite.
 */
export function CartePouls({
  donnees,
  signauxInitiaux,
}: {
  donnees: CarteGeoJson;
  signauxInitiaux: SignalDepistage[];
}) {
  const [ondes, setOndes] = useState<Onde[]>([]);
  const [communeEnCours, setCommuneEnCours] = useState<string | null>(null);
  const [voisins, setVoisins] = useState<unknown | null>(null);

  const vus = useRef(new Set(signauxInitiaux.map((s) => s.id)));
  const compteur = useRef(0);
  const retombee = useRef<number | null>(null);

  /*
   * Centre approché de chaque commune, calculé sur ses sommets. Suffisant
   * pour poser un point : on ne mesure rien, on désigne un territoire.
   */
  const centres = useMemo(
    () =>
      donnees.features
        .map((f) => {
          const points: number[][] = [];
          const empiler = (n: unknown) => {
            if (Array.isArray(n) && typeof n[0] === 'number') points.push(n as number[]);
            else if (Array.isArray(n)) n.forEach(empiler);
          };
          empiler((f.geometry as { coordinates: unknown }).coordinates);
          if (points.length === 0) return null;
          const lng = points.reduce((t, p) => t + p[0], 0) / points.length;
          const lat = points.reduce((t, p) => t + p[1], 0) / points.length;
          return { nom: f.properties.nom, lat, lng };
        })
        .filter((c): c is { nom: string; lat: number; lng: number } => c !== null),
    [donnees],
  );

  /* ─── Frontières des pays limitrophes ──────────────────────────────── */
  useEffect(() => {
    let annule = false;
    fetch('/voisins-benin.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((contours) => {
        if (!annule) setVoisins(contours);
      })
      .catch(() => {
        // Sans les frontières la carte reste lisible : on n'insiste pas.
      });
    return () => {
      annule = true;
    };
  }, []);

  /* ─── Émission d'une onde ──────────────────────────────────────────── */
  function emettreEn(lat: number, lng: number, cleSource: string) {
    const cle = `${cleSource}-${(compteur.current += 1)}`;

    setOndes((courantes) => [...courantes, { cle, lat, lng }]);
    window.setTimeout(() => {
      setOndes((courantes) => courantes.filter((o) => o.cle !== cle));
    }, DUREE_ONDE);
  }

  /* ─── Interrogation régulière ──────────────────────────────────────── */
  useEffect(() => {
    let annule = false;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    async function interroger() {
      try {
        const reponse = await fetch(`${base}/api/stats/derniers`, { cache: 'no-store' });
        if (!reponse.ok || annule) return;

        const recus: SignalDepistage[] = await reponse.json();
        const nouveaux = recus.filter((s) => !vus.current.has(s.id));
        if (nouveaux.length === 0) return;

        for (const signal of nouveaux) vus.current.add(signal.id);
        setCommuneEnCours(nouveaux[0].commune);

        if (retombee.current !== null) window.clearTimeout(retombee.current);
        retombee.current = window.setTimeout(
          () => setCommuneEnCours(null),
          DUREE_EVEIL,
        );

        // Les arrivées sont espacées : dix ondes simultanées ne se lisent pas.
        nouveaux.slice(0, 6).forEach((signal, rang) => {
          window.setTimeout(() => {
            if (!annule && signal.lat !== null && signal.lng !== null) {
              emettreEn(signal.lat, signal.lng, String(signal.id));
            }
          }, rang * 700);
        });
      } catch {
        // Réseau indisponible : la carte reste lisible, sans onde.
      }
    }

    const minuteur = window.setInterval(interroger, INTERVALLE_INTERROGATION);
    return () => {
      annule = true;
      window.clearInterval(minuteur);
      if (retombee.current !== null) window.clearTimeout(retombee.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      {/*
        Le fond de tuiles est retiré : les contours flottent sur le dégradé du
        bandeau, comme sur la maquette. Les frontières des voisins remplacent
        le repère géographique que les tuiles apportaient.
      */}
      <CarteBenin
        donnees={donnees}
        interactive={false}
        afficherAttribution={false}
        fondCarte={false}
        contoursVoisins={voisins}
        ondes={ondes}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {VOISINS.map((voisin) => (
          <span
            key={voisin.nom}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ablode-gris/55"
            style={{ left: `${voisin.x}%`, top: `${voisin.y}%` }}
          >
            {voisin.nom}
          </span>
        ))}
      </div>

      {/* Rien n'arrive, rien ne s'affiche : c'est l'information. */}
      {communeEnCours && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-full bg-white/90 px-4 py-2.5 shadow-carte backdrop-blur-sm sm:left-4">
          <span className="inline-block h-1.5 w-1.5 animate-battement rounded-full bg-ablode-vert" />
          <span className="text-[0.8125rem] font-semibold text-ablode-encre">
            Dépistage en cours
          </span>
          <span className="text-[0.8125rem] text-ablode-gris">{communeEnCours}</span>
        </div>
      )}
    </div>
  );
}
