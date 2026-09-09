'use client';

import { useEffect, useState } from 'react';
import { CarteBenin } from '@/components/carte/CarteDynamique';
import { API_URL } from '@/lib/api';
import type { CarteGeoJson } from '@/lib/types';

const VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

/** Vert des territoires sur le volet sombre, et trait qui les sépare. */
const VERT_TERRITOIRE = '#2f7d57';
const TRAIT_TERRITOIRE = '#12291f';

/**
 * Carte du volet de connexion (maquette 04).
 *
 * Elle occupe tout le volet, le bas passant sous la citation : le pays n'est
 * pas une vignette posée au centre, c'est le fond du panneau. Le fond de
 * tuiles est retiré — routes et noms de villes n'apportent rien ici.
 *
 * Décorative, et assumée comme telle : les communes sont d'une seule teinte.
 * Une choroplèthe sans légende, devant quelqu'un qui n'est pas encore
 * connecté, ne serait pas lisible — et les communes sans dépistage y
 * ressortaient en gris pâle, comme autant de trous dans le pays.
 *
 * Les contours viennent de l'API publique : aucune information sensible
 * n'est exposée avant authentification.
 */
export function VignetteCarte() {
  const [carte, setCarte] = useState<CarteGeoJson>(VIDE);

  useEffect(() => {
    let annule = false;

    void fetch(`${API_URL}/api/stats/carte?periode=tout`)
      .then((reponse) => (reponse.ok ? reponse.json() : VIDE))
      .then((donnees) => {
        if (!annule) setCarte(donnees);
      })
      .catch(() => undefined);

    return () => {
      annule = true;
    };
  }, []);

  if (carte.features.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 top-12 animate-apparition">
      <CarteBenin
        donnees={carte}
        interactive={false}
        afficherAttribution={false}
        fondCarte={false}
        couleurTrait={TRAIT_TERRITOIRE}
        remplissageUni={VERT_TERRITOIRE}
      />
    </div>
  );
}
