'use client';

import { useId, useMemo } from 'react';
import type { PointDirect } from '@/lib/types';

/**
 * Convertit une suite de points en courbe lissée.
 *
 * Interpolation de Catmull-Rom traduite en courbes de Bézier cubiques : la
 * courbe passe exactement par chaque point mesuré — rien n'est déplacé — mais
 * les angles vifs entre deux intervalles sont adoucis.
 *
 * Les ordonnées des points de contrôle sont bridées à l'intervalle des deux
 * points qu'ils relient. Sans ce bridage, un pic isolé au milieu de zéros
 * faisait passer la courbe sous la ligne de base avant de remonter : un
 * creux qui n'existe dans aucune mesure.
 */
function courbeLissee(points: Array<[number, number]>, tension = 0.22): string {
  if (points.length < 2) return '';

  const brider = (valeur: number, a: number, b: number) =>
    Math.min(Math.max(valeur, Math.min(a, b)), Math.max(a, b));

  let chemin = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c1y = brider(p1[1] + (p2[1] - p0[1]) * tension, p1[1], p2[1]);
    const c2y = brider(p2[1] - (p3[1] - p1[1]) * tension, p1[1], p2[1]);

    chemin += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }

  return chemin;
}

/**
 * Moyenne glissante courte, appliquée avant de tracer une sparkline.
 *
 * À trois centimètres de large, une série qui alterne 0 et 4 d'un intervalle
 * à l'autre dessine un peigne illisible. La moyenne en donne la tendance,
 * qui est la seule chose qu'une sparkline puisse dire.
 */
function adoucir(valeurs: number[], rayon = 2): number[] {
  return valeurs.map((_, i) => {
    const tranche = valeurs.slice(
      Math.max(0, i - rayon),
      Math.min(valeurs.length, i + rayon + 1),
    );
    return tranche.reduce((somme, v) => somme + v, 0) / tranche.length;
  });
}

/**
 * Tracé du flux entrant : courbe des arrivées, moyenne glissante en
 * pointillé, cas en barres sous la ligne de base.
 *
 * SVG écrit à la main plutôt que Chart.js : le graphe n'a ni axes, ni légende,
 * ni interaction, et se redessine toutes les deux secondes sur la fenêtre la
 * plus fine. Une bibliothèque coûterait ici plus qu'elle n'apporte.
 */
export function GrapheFlux({ serie }: { serie: PointDirect[] }) {
  /* Les identifiants de dégradé doivent être uniques par instance du composant. */
  const cle = useId().replace(/:/g, '');

  const L = 1000;
  const H = 268;
  const HAUT = 26;
  const BAS = 206; // Ligne de base ; les barres occupent la bande du dessous.
  const BANDE_BARRES = 48;

  const trace = useMemo(() => {
    if (serie.length < 2) return null;

    const maxDepistages = Math.max(1, ...serie.map((p) => p.depistages));
    const maxCas = Math.max(1, ...serie.map((p) => p.cas));
    const pas = L / (serie.length - 1);

    const y = (valeur: number) => HAUT + (BAS - HAUT) * (1 - valeur / maxDepistages);

    const points: Array<[number, number]> = serie.map((p, i) => [i * pas, y(p.depistages)]);
    const ligne = courbeLissee(points);

    /*
     * Moyenne sur cinq intervalles : elle donne la tendance quand la courbe
     * brute est hachée. Fenêtre tronquée aux bords, sans remplissage — un
     * remplissage inventerait des valeurs aux extrémités.
     */
    const moyenne = courbeLissee(
      serie.map((_, i) => {
        const tranche = serie.slice(Math.max(0, i - 2), Math.min(serie.length, i + 3));
        const total = tranche.reduce((somme, p) => somme + p.depistages, 0);
        return [i * pas, y(total / tranche.length)];
      }),
    );

    const barres = serie.map((p, i) => ({
      cle: `${p.borne}-${i}`,
      x: i * pas,
      largeur: Math.max(2.5, pas * 0.5),
      hauteur: p.cas === 0 ? 0 : Math.max(3, (BANDE_BARRES * p.cas) / maxCas),
    }));

    const dernier = points[points.length - 1];

    return {
      ligne,
      aire: `${ligne} L ${L},${BAS} L 0,${BAS} Z`,
      moyenne,
      barres,
      tete: dernier,
      maxDepistages,
      total: serie.reduce((somme, p) => somme + p.depistages, 0),
    };
  }, [serie]);

  if (!trace) {
    return (
      <div className="flex h-[210px] items-center justify-center text-[0.8125rem] text-admin-gris">
        Pas encore assez de points pour tracer un flux.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      preserveAspectRatio="none"
      className="h-[210px] w-full overflow-visible"
      role="img"
      aria-label={`Flux entrant sur ${serie.length} intervalles, ${trace.total} arrivées, jusqu’à ${trace.maxDepistages} par intervalle`}
    >
      <defs>
        {/* Dégradé sous la courbe : dense à la base, effacé vers le haut. */}
        <linearGradient id={`aire-${cle}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e9d68" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#2e9d68" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#2e9d68" stopOpacity="0" />
        </linearGradient>

        {/* Barres des cas : plus soutenues en bas qu'en haut. */}
        <linearGradient id={`barre-${cle}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e9d68" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2e9d68" stopOpacity="0.35" />
        </linearGradient>

        {/* Halo de la tête de courbe. */}
        <radialGradient id={`halo-${cle}`}>
          <stop offset="0%" stopColor="#2e9d68" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2e9d68" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Repères horizontaux, très discrets : ils situent sans quadriller. */}
      {[0, 0.25, 0.5, 0.75, 1].map((part) => (
        <line
          key={part}
          x1={0}
          x2={L}
          y1={HAUT + (BAS - HAUT) * part}
          y2={HAUT + (BAS - HAUT) * part}
          stroke="currentColor"
          strokeWidth={1}
          className={part === 1 ? 'text-admin-gris/40' : 'text-admin-trait'}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <path d={trace.aire} fill={`url(#aire-${cle})`} />

      {trace.barres.map((barre) =>
        barre.hauteur === 0 ? null : (
          <rect
            key={barre.cle}
            x={barre.x - barre.largeur / 2}
            y={BAS + BANDE_BARRES - barre.hauteur}
            width={barre.largeur}
            height={barre.hauteur}
            rx={1.5}
            fill={`url(#barre-${cle})`}
          />
        ),
      )}

      <path
        d={trace.moyenne}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="6 5"
        strokeLinecap="round"
        className="text-admin-vert/70"
        vectorEffect="non-scaling-stroke"
      />

      <path
        d={trace.ligne}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-admin-encre"
        vectorEffect="non-scaling-stroke"
      />

      {/*
        Tête de courbe : où en est le flux à l'instant présent. Le halo bat
        au rythme du point « en direct » de l'en-tête ; il se fige si le
        système est réglé sur animations réduites.
      */}
      <circle
        cx={trace.tete[0]}
        cy={trace.tete[1]}
        r={22}
        fill={`url(#halo-${cle})`}
        className="animate-battement motion-reduce:animate-none"
        style={{ transformOrigin: `${trace.tete[0]}px ${trace.tete[1]}px` }}
      />
      <circle cx={trace.tete[0]} cy={trace.tete[1]} r={5} className="fill-white" />
      <circle cx={trace.tete[0]} cy={trace.tete[1]} r={3.5} className="fill-admin-encre" />
    </svg>
  );
}

/**
 * Sparkline d'une tuile de chiffre clé. Trop petite pour porter une échelle :
 * elle ne dit que la forme du mouvement, pas son amplitude.
 */
export function Sparkline({ valeurs, libelle }: { valeurs: number[]; libelle: string }) {
  const cle = useId().replace(/:/g, '');

  const trace = useMemo(() => {
    if (valeurs.length < 2) return null;
    const lisses = adoucir(valeurs);
    const min = Math.min(...lisses);
    const max = Math.max(...lisses);
    const amplitude = max - min || 1;
    const pas = 100 / (lisses.length - 1);
    const points: Array<[number, number]> = lisses.map((v, i) => [
      i * pas,
      25 - 21 * ((v - min) / amplitude),
    ]);
    const ligne = courbeLissee(points, 0.2);
    return { ligne, aire: `${ligne} L 100,28 L 0,28 Z`, fin: points[points.length - 1] };
  }, [valeurs]);

  if (!trace) return null;

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="h-8 w-24 shrink-0 overflow-visible"
      role="img"
      aria-label={libelle}
    >
      <defs>
        <linearGradient id={`spark-${cle}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e9d68" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2e9d68" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={trace.aire} fill={`url(#spark-${cle})`} />
      <path
        d={trace.ligne}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        className="text-admin-vert"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={trace.fin[0]} cy={trace.fin[1]} r={2} className="fill-admin-vert" />
    </svg>
  );
}
