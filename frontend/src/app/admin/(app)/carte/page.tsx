'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CarteBenin } from '@/components/carte/CarteDynamique';
import { DetailCommune } from '@/components/carte/DetailCommune';
import { PanneauFiltres } from '@/components/carte/FiltresCarte';
import type { ProprietesCommune } from '@/components/carte/CarteBenin';
import { Alerte, EnTetePage } from '@/components/admin/Elements';
import { apiAdmin } from '@/lib/api';
import { nombre } from '@/lib/format';
import { niveauPourZoom } from '@/lib/niveau-carte';
import type { CarteGeoJson, FiltresCarte, NiveauCarte } from '@/lib/types';

const CARTE_VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

type Point = { lat: number; lng: number; resultat: string; type: string };

/**
 * Carte admin (section 3.3.2) : choroplèthe communale, superposition des
 * points de dépistage individuels et export de la vue en image.
 */
export default function PageCarteAdmin() {
  const [filtres, setFiltres] = useState<FiltresCarte>({ periode: 'tout' });
  const [carte, setCarte] = useState<CarteGeoJson>(CARTE_VIDE);
  const [points, setPoints] = useState<Point[]>([]);
  const [afficherPoints, setAfficherPoints] = useState(false);
  /** Découpage courant, déduit du zoom. */
  const [niveau, setNiveau] = useState<NiveauCarte>('departement');
  const [commune, setCommune] = useState<ProprietesCommune | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const conteneur = useRef<HTMLDivElement>(null);

  const charger = useCallback(
    async (courants: FiltresCarte, avecPoints: boolean, niveauCourant: NiveauCarte) => {
    setChargement(true);
    try {
      const params = {
        periode: courants.periode,
        type: courants.type,
        sexe: courants.sexe,
        ageMin: courants.ageMin,
        ageMax: courants.ageMax,
      };

      const geojson = await apiAdmin<CarteGeoJson>('/stats/carte', {
        params: { ...params, niveau: niveauCourant },
      });
      setCarte(geojson);

      if (avecPoints) {
        setPoints(await apiAdmin<Point[]>('/stats/points', { params }));
      } else {
        setPoints([]);
      }
      setErreur('');
    } catch {
      setErreur('Chargement de la carte impossible.');
    } finally {
      setChargement(false);
    }
    },
    [],
  );

  useEffect(() => {
    void charger(filtres, afficherPoints, niveau);
  }, [filtres, afficherPoints, niveau, charger]);

  const surZoom = useCallback((zoom: number) => {
    setNiveau((actuel) => {
      const suivant = niveauPourZoom(zoom, actuel);
      if (suivant !== actuel) setCommune(null);
      return suivant;
    });
  }, []);

  /**
   * Export PNG (US-CAR-05).
   *
   * Les tuiles du fond de carte proviennent d'un autre domaine : le canvas
   * serait « teinté » et illisible. On exporte donc les contours et les points
   * redessinés à partir du GeoJSON, sans fond de carte.
   */
  function exporterImage() {
    const largeur = 900;
    const hauteur = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largeur, hauteur);

    // Emprise du Bénin, identique au cadrage de la carte interactive.
    const [minLng, maxLng, minLat, maxLat] = [0.7, 3.9, 6.2, 12.5];
    const projeter = (lng: number, lat: number): [number, number] => [
      ((lng - minLng) / (maxLng - minLng)) * (largeur - 80) + 40,
      hauteur - 80 - ((lat - minLat) / (maxLat - minLat)) * (hauteur - 160),
    ];

    const dessinerAnneau = (anneau: number[][]) => {
      ctx.beginPath();
      anneau.forEach(([lng, lat], index) => {
        const [x, y] = projeter(lng, lat);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    for (const feature of carte.features) {
      const { taux, depistages } = feature.properties;
      ctx.fillStyle =
        depistages === 0
          ? '#eef0ef'
          : taux < 3
            ? '#dcf0e4'
            : taux < 5
              ? '#a8dcc0'
              : taux < 8
                ? '#6cc496'
                : taux <= 11
                  ? '#2e9d68'
                  : '#12603f';

      const geometrie = feature.geometry as {
        type: string;
        coordinates: number[][][] | number[][][][];
      };
      if (geometrie.type === 'Polygon') {
        (geometrie.coordinates as number[][][]).forEach(dessinerAnneau);
      } else if (geometrie.type === 'MultiPolygon') {
        (geometrie.coordinates as number[][][][]).forEach((polygone) =>
          polygone.forEach(dessinerAnneau),
        );
      }
    }

    if (afficherPoints) {
      for (const point of points) {
        const [x, y] = projeter(point.lng, point.lat);
        ctx.fillStyle = ['diabete', 'obesite', 'autre'].includes(point.resultat)
          ? 'rgba(192, 57, 43, 0.55)'
          : 'rgba(13, 143, 91, 0.55)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#101614';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      `MyABLODE — Prévalence par ${niveau === 'departement' ? 'département' : 'commune'}`,
      40,
      44,
    );
    ctx.font = '13px monospace';
    ctx.fillStyle = '#6b7671';
    ctx.fillText(
      `Période : ${filtres.periode} · Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      40,
      hauteur - 32,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = nomImageCarte(filtres, afficherPoints, niveau);
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  }

  return (
    <>
      <EnTetePage
        titre="Carte admin"
        complement={`${carte.features.length} ${
          niveau === 'departement' ? 'départements' : 'communes'
        }${
          afficherPoints ? ` · ${nombre(points.length)} points` : ''
        }`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setAfficherPoints((courant) => !courant)}
              aria-pressed={afficherPoints}
              className={afficherPoints ? 'admin-bouton' : 'admin-bouton-clair'}
            >
              {afficherPoints ? '✓ Points affichés' : 'Afficher les points'}
            </button>
            <button type="button" onClick={exporterImage} className="admin-bouton-clair">
              Exporter en PNG
            </button>
          </>
        }
      />

      <div className="p-6">
        {erreur && (
          <div className="mb-4">
            <Alerte type="erreur">{erreur}</Alerte>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
          <div className="space-y-5">
            <div className="admin-panneau p-5">
              <h2 className="etiquette mb-4">Filtrer la carte</h2>
              <PanneauFiltres filtres={filtres} onChangement={setFiltres} compact />
              {chargement && (
                <p className="mt-4 animate-pulsation font-mono text-etiquette uppercase text-admin-gris">
                  Chargement…
                </p>
              )}
            </div>

            {afficherPoints && (
              <div className="admin-panneau p-5">
                <h2 className="etiquette mb-3">Points individuels</h2>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full bg-ablode-alerte/60"
                    />
                    Cas détecté
                  </li>
                  <li className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full bg-admin-vert/60"
                    />
                    Résultat normal ou pré-diabète
                  </li>
                </ul>
                <p className="mt-3 text-[0.75rem] leading-relaxed text-admin-gris">
                  Position GPS approximative, limitée aux 3 000 dépistages les plus
                  récents. Donnée sensible : jamais exposée sur le site public.
                </p>
              </div>
            )}

            {commune && (
              <DetailCommune commune={commune} onFermer={() => setCommune(null)} />
            )}
          </div>

          {/*
            Sur petit écran, les filtres sont empilés au-dessus : réserver
            toute la hauteur de la fenêtre à la carte obligerait à défiler
            deux fois pour la voir en entier.
          */}
          <div
            ref={conteneur}
            className="admin-panneau h-[55vh] min-h-[340px] xl:h-[calc(100vh-190px)] xl:min-h-[520px]"
          >
            <CarteBenin
              donnees={carte}
              points={afficherPoints ? points : undefined}
              onCommuneSelectionnee={setCommune}
              communeSelectionneeId={commune?.id ?? null}
              onZoomChange={surZoom}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Nom de l'image exportée.
 *
 * Une carte n'a de sens qu'avec ses filtres : deux exports du même jour sur
 * des périodes différentes portaient jusqu'ici le même nom et s'écrasaient
 * dans le dossier de téléchargement.
 */
function nomImageCarte(
  filtres: FiltresCarte,
  avecPoints: boolean,
  niveau: NiveauCarte,
): string {
  const morceaux = ['carte-prevalence', niveau === 'departement' ? 'departements' : 'communes'];

  if (filtres.periode === 'perso' && filtres.dateDebut) {
    morceaux.push(`${filtres.dateDebut}_${filtres.dateFin ?? 'a-ce-jour'}`);
  } else {
    morceaux.push(filtres.periode);
  }

  if (filtres.type) morceaux.push(filtres.type);
  if (filtres.sexe) morceaux.push(filtres.sexe === 'F' ? 'femmes' : 'hommes');
  if (filtres.ageMin !== undefined || filtres.ageMax !== undefined) {
    morceaux.push(`${filtres.ageMin ?? 0}-${filtres.ageMax ?? 120}ans`);
  }
  if (avecPoints) morceaux.push('avec-points');

  morceaux.push(new Date().toISOString().slice(0, 10));
  return `${morceaux.join('-')}.png`;
}
