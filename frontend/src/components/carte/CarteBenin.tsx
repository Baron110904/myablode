'use client';

import 'leaflet/dist/leaflet.css';
import type { Layer, LayerGroup, LeafletMouseEvent, PathOptions } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { nombre, paliersPrevalence, pourcentage } from '@/lib/format';
import type { CarteGeoJson, NiveauCarte } from '@/lib/types';

/**
 * Cadrage sur le Bénin, d'après les bornes du GeoJSON ADM2 chargé en base.
 *
 * `BORNES_PAYS` sert de cadrage initial : Leaflet ajuste le zoom au conteneur,
 * ce qu'un couple centre/zoom fixe ne saurait faire — la carte occupe des
 * espaces très différents selon la page (bannière large, colonne étroite).
 * `BORNES_NAVIGATION` est plus lâche : elle laisse respirer le déplacement
 * sans permettre de perdre le pays de vue.
 */
const BORNES_PAYS: [[number, number], [number, number]] = [
  [6.2, 0.75],
  [12.45, 3.9],
];
const BORNES_NAVIGATION: [[number, number], [number, number]] = [
  [4.5, -1.5],
  [14.5, 6.0],
];

/**
 * Propriétés d'un territoire coloré — commune ou département selon le zoom.
 * Le champ `niveau` dit lequel, pour que l'interface nomme correctement ce
 * qui est survolé ou sélectionné.
 */
export interface ProprietesCommune {
  id: number;
  nom: string;
  departement: string | null;
  niveau: NiveauCarte;
  population: number | null;
  /** Dépistés pour 1 000 habitants. */
  couverture: number | null;
  depistages: number;
  cas: number;
  diabete: number;
  obesite: number;
  taux: number;
  derniere_campagne: string | null;
}

interface Props {
  donnees: CarteGeoJson;
  /** Remonte la commune cliquée : le parent affiche le panneau de détail. */
  onCommuneSelectionnee?: (commune: ProprietesCommune | null) => void;
  communeSelectionneeId?: number | null;
  interactive?: boolean;
  hauteur?: string;
  /** Couche de points individuels — carte admin uniquement. */
  points?: Array<{ lat: number; lng: number; resultat: string; type: string }>;
  afficherAttribution?: boolean;
  /**
   * Fond de carte OpenStreetMap. Retiré sur la bannière d'accueil : la
   * maquette y fait flotter les contours sur le dégradé, sans routes ni
   * villes qui concurrencent la lecture des couleurs.
   */
  fondCarte?: boolean;
  /**
   * Frontières des pays limitrophes, en trait fin. Utile quand le fond de
   * tuiles est retiré : sans elles, le Bénin flotte dans le vide et on perd
   * le repère géographique.
   */
  contoursVoisins?: unknown | null;
  /**
   * Ondes à faire éclore, en coordonnées géographiques. Dessinées par Leaflet
   * plutôt qu'en surcouche HTML : une position en pourcentage du conteneur
   * dérive dès que le cadrage ajoute des marges, et les points tombaient à
   * côté du pays.
   */
  ondes?: Array<{ cle: string; lat: number; lng: number }>;
  /**
   * Intensité d'activité par territoire, de 0 à 1 : chaque arrivée la fait
   * monter, le temps la fait redescendre.
   *
   * La couleur du territoire est mélangée vers l'ambre à proportion, et un
   * point clignotant est posé sur son centre. C'est ce qui donne à voir où la
   * collecte se passe en ce moment, alors que le taux de prévalence — la
   * couleur de fond — ne bouge pratiquement pas à l'échelle d'une matinée.
   */
  activite?: Map<number, number>;
  /**
   * Remonte le zoom courant. Le parent en déduit le découpage à charger : la
   * carte ne décide pas seule, c'est lui qui détient les données.
   */
  onZoomChange?: (zoom: number) => void;
  /**
   * Couleur du trait entre territoires. Le blanc va sur fond clair ; posée
   * sur un panneau sombre, la même carte se lirait comme un grillage blanc —
   * il faut alors un trait plus foncé que les remplissages.
   */
  couleurTrait?: string;
  /**
   * Teinte unique pour tous les territoires, à la place de la choroplèthe.
   *
   * Réservé aux usages décoratifs, comme le volet de l'écran de connexion :
   * là, une échelle de couleurs n'a pas de légende, personne ne peut la lire,
   * et les communes sans dépistage ressortiraient en gris pâle comme autant
   * de trous. Une teinte unie ne prétend rien mesurer.
   */
  remplissageUni?: string;
}

export default function CarteBenin({
  donnees,
  onCommuneSelectionnee,
  communeSelectionneeId,
  interactive = true,
  hauteur = '100%',
  points,
  afficherAttribution = true,
  fondCarte = true,
  contoursVoisins = null,
  ondes = [],
  activite,
  onZoomChange,
  couleurTrait = '#ffffff',
  remplissageUni,
}: Props) {
  /**
   * Clé de rendu du calque GeoJSON : sans elle, Leaflet réutilise les couches
   * existantes et conserve les anciennes couleurs après un changement de filtre.
   */
  const cleDonnees = useMemo(
    () =>
      donnees.features
        .map(
          (f) =>
            `${f.properties.niveau}:${f.properties.id}:${f.properties.taux}:${f.properties.depistages}`,
        )
        .join('|'),
    [donnees],
  );

  /*
   * Signature de l'activité : sans elle, le calque GeoJSON n'est pas redessiné
   * et les territoires gardent la couleur du tour précédent.
   */
  const cleActivite = useMemo(
    () =>
      activite
        ? [...activite.entries()]
            .map(([id, v]) => `${id}:${v.toFixed(2)}`)
            .sort()
            .join(',')
        : '',
    [activite],
  );

  const style = useCallback(
    (feature?: Feature<Geometry, ProprietesCommune>): PathOptions => {
      const props = feature?.properties;
      if (!props) return {};

      const { couleur } = paliersPrevalence(props.taux, props.depistages);
      const selectionnee = communeSelectionneeId === props.id;
      const chaleur = activite?.get(props.id) ?? 0;

      const base = remplissageUni ?? couleur;

      return {
        fillColor: chaleur > 0 ? melanger(base, '#0d8f5b', chaleur * 0.3) : base,
        fillOpacity: 1,
        color: chaleur > 0 ? '#0d8f5b' : selectionnee ? '#101614' : couleurTrait,
        weight: chaleur > 0 ? 1.4 : selectionnee ? 2 : 0.8,
        opacity: 1,
      };
    },
    [communeSelectionneeId, couleurTrait, remplissageUni, activite],
  );

  const surChaqueCommune = useCallback(
    (feature: Feature<Geometry, ProprietesCommune>, couche: Layer) => {
      const props = feature.properties;

      couche.bindTooltip(
        `<span class="font-mono text-[11px] uppercase tracking-wider">${echapper(props.nom)}</span>` +
          `<br/><span class="text-[12px]">${
            props.depistages > 0
              ? `${nombre(props.depistages)} dépistages · ${pourcentage(props.taux)}`
              : 'Aucun dépistage'
          }</span>`,
        { sticky: true, direction: 'top', opacity: 1 },
      );

      if (!interactive) return;

      couche.on({
        click: () => onCommuneSelectionnee?.(props),
        mouseover: (evenement: LeafletMouseEvent) => {
          const cible = evenement.target;
          cible.setStyle({ weight: 2, color: '#101614' });
          cible.bringToFront();
        },
        mouseout: (evenement: LeafletMouseEvent) => {
          const selectionnee = communeSelectionneeId === props.id;
          evenement.target.setStyle({
            weight: selectionnee ? 2 : 0.8,
            color: selectionnee ? '#101614' : couleurTrait,
          });
        },
      });
    },
    [interactive, onCommuneSelectionnee, communeSelectionneeId, couleurTrait],
  );

  return (
    <MapContainer
      bounds={BORNES_PAYS}
      boundsOptions={{ padding: [8, 8] }}
      /* Zoom fractionnaire : arrondi à l'entier, le pays n'occuperait qu'une
         fraction du conteneur sur les formats larges. */
      zoomSnap={0.25}
      zoomDelta={0.5}
      minZoom={5}
      maxZoom={12}
      maxBounds={BORNES_NAVIGATION}
      maxBoundsViscosity={0.5}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      /* Contrôles repositionnés plus bas : le coin haut-gauche est occupé par
         le panneau de filtres, qui recouvrait les boutons + / −. */
      zoomControl={false}
      attributionControl={afficherAttribution}
      style={{ height: hauteur, width: '100%' }}
      className="z-0"
    >
      {/*
        Fond OpenStreetMap, atténué : la choroplèthe verte doit rester la
        couche lisible. Les fonds CARTO « light » demandent désormais une clé
        API et affichent un filigrane sans elle.
      */}
      {fondCarte && (
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          opacity={0.4}
          maxZoom={19}
        />
      )}

      {/* Dessinées avant les communes : elles restent en arrière-plan. */}
      {contoursVoisins !== null && (
        <GeoJSON
          key="voisins"
          data={contoursVoisins as never}
          style={
            {
              color: '#9fb3a9',
              weight: 1,
              opacity: 0.65,
              fill: false,
              interactive: false,
            } as never
          }
        />
      )}

      <GeoJSON
        key={`${cleDonnees}#${cleActivite}`}
        data={donnees as never}
        style={style as never}
        onEachFeature={surChaqueCommune as never}
      />

      {ondes.length > 0 && <CoucheOndes ondes={ondes} />}
      {activite && activite.size > 0 && (
        <CouchePointsActifs donnees={donnees} activite={activite} />
      )}
      {onZoomChange && <EcouteZoom onZoomChange={onZoomChange} />}
      {interactive && <ZoomControl position="bottomright" />}
      {points && points.length > 0 && <CouchePoints points={points} />}
    </MapContainer>
  );
}

/**
 * Rapporte le zoom au parent, à l'ouverture puis à chaque changement.
 *
 * `zoomend` suffit : inutile de suivre le zoom pendant l'animation, seule la
 * valeur d'arrivée détermine le découpage à afficher.
 */
function EcouteZoom({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const carte = useMapEvents({
    zoomend: () => onZoomChange(carte.getZoom()),
  });

  useEffect(() => {
    onZoomChange(carte.getZoom());
  }, [carte, onZoomChange]);

  return null;
}

/**
 * Ondes de dépistage : un point net et un cercle qui s'ouvre.
 *
 * Les cercles sont des éléments SVG de Leaflet ; l'animation est portée par
 * une classe CSS, ce qui évite d'animer un rayon en JavaScript image par
 * image.
 */
function CoucheOndes({
  ondes,
}: {
  ondes: Array<{ cle: string; lat: number; lng: number }>;
}) {
  const carte = useMap();
  const couches = useRef(new Map<string, LayerGroup>());

  useEffect(() => {
    let annule = false;

    void import('leaflet').then((L) => {
      if (annule) return;
      const vivantes = new Set(ondes.map((o) => o.cle));

      // Retirer celles qui ont fini leur course.
      for (const [cle, groupe] of couches.current) {
        if (!vivantes.has(cle)) {
          groupe.remove();
          couches.current.delete(cle);
        }
      }

      for (const onde of ondes) {
        if (couches.current.has(onde.cle)) continue;

        const groupe = L.layerGroup();
        L.circleMarker([onde.lat, onde.lng], {
          radius: 26,
          color: '#0d8f5b',
          weight: 2,
          fill: false,
          interactive: false,
          className: 'onde-depistage',
        }).addTo(groupe);
        L.circleMarker([onde.lat, onde.lng], {
          radius: 4,
          fillColor: '#0d8f5b',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 2,
          interactive: false,
        }).addTo(groupe);

        groupe.addTo(carte);
        couches.current.set(onde.cle, groupe);
      }
    });

    return () => {
      annule = true;
    };
  }, [ondes, carte]);

  // Nettoyage au démontage : sinon les cercles survivent au changement de page.
  useEffect(
    () => () => {
      for (const groupe of couches.current.values()) groupe.remove();
      couches.current.clear();
    },
    [],
  );

  return null;
}

/**
 * Points de dépistage individuels.
 *
 * Dessinés en cercles vectoriels plutôt qu'en marqueurs : plusieurs milliers
 * d'icônes DOM feraient chuter la fluidité de la carte.
 */
function CouchePoints({
  points,
}: {
  points: Array<{ lat: number; lng: number; resultat: string; type: string }>;
}) {
  const carte = useMap();
  const coucheRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let annule = false;

    void import('leaflet').then((L) => {
      if (annule) return;

      coucheRef.current?.remove();
      const groupe = L.layerGroup();

      for (const point of points) {
        const positif = ['diabete', 'obesite', 'autre'].includes(point.resultat);
        L.circleMarker([point.lat, point.lng], {
          radius: 3,
          fillColor: positif ? '#c0392b' : '#0d8f5b',
          fillOpacity: 0.55,
          color: 'transparent',
          weight: 0,
        }).addTo(groupe);
      }

      groupe.addTo(carte);
      coucheRef.current = groupe;
    });

    return () => {
      annule = true;
      coucheRef.current?.remove();
      coucheRef.current = null;
    };
  }, [points, carte]);

  return null;
}

/** Le contenu des infobulles est injecté en HTML : les noms sont échappés. */
function echapper(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Mélange deux couleurs hexadécimales.
 *
 * Sert à réchauffer la teinte d'un territoire à proportion de son activité,
 * plutôt qu'à basculer d'un coup sur une couleur d'alerte : un dégradé se lit
 * comme une intensité, un aplat comme un état.
 */
function melanger(depart: string, arrivee: string, part: number): string {
  const lire = (couleur: string) => [
    parseInt(couleur.slice(1, 3), 16),
    parseInt(couleur.slice(3, 5), 16),
    parseInt(couleur.slice(5, 7), 16),
  ];
  const [r1, v1, b1] = lire(depart);
  const [r2, v2, b2] = lire(arrivee);
  const p = Math.min(1, Math.max(0, part));
  const composante = (a: number, b: number) =>
    Math.round(a + (b - a) * p)
      .toString(16)
      .padStart(2, '0');
  return `#${composante(r1, r2)}${composante(v1, v2)}${composante(b1, b2)}`;
}

/**
 * Points clignotants sur les territoires en activité.
 *
 * Le centre est calculé sur les sommets du polygone : suffisant pour poser un
 * repère, et cela évite d'exiger un centroïde dans les propriétés — la carte
 * par département n'en fournit pas.
 */
function CouchePointsActifs({
  donnees,
  activite,
}: {
  donnees: CarteGeoJson;
  activite: Map<number, number>;
}) {
  const carte = useMap();
  const groupe = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let annule = false;

    void import('leaflet').then((L) => {
      if (annule) return;

      groupe.current?.remove();
      const nouveau = L.layerGroup();

      for (const feature of donnees.features) {
        const chaleur = activite.get(feature.properties.id) ?? 0;
        if (chaleur <= 0) continue;

        const sommets: number[][] = [];
        const empiler = (n: unknown) => {
          if (Array.isArray(n) && typeof n[0] === 'number') sommets.push(n as number[]);
          else if (Array.isArray(n)) n.forEach(empiler);
        };
        empiler((feature.geometry as { coordinates: unknown }).coordinates);
        if (sommets.length === 0) continue;

        const lng = sommets.reduce((t, p) => t + p[0], 0) / sommets.length;
        const lat = sommets.reduce((t, p) => t + p[1], 0) / sommets.length;

        /*
         * Anneau qui s'ouvre, puis le point lui-même : c'est le vocabulaire
         * déjà employé pour les arrivées, en vert et discret. Une grosse
         * pastille ambre attirait l'œil bien au-delà de ce qu'elle dit.
         */
        L.circleMarker([lat, lng], {
          radius: 14,
          color: '#0d8f5b',
          weight: 1.5,
          fill: false,
          interactive: false,
          className: 'halo-actif',
        }).addTo(nouveau);

        L.circleMarker([lat, lng], {
          radius: 3.5,
          fillColor: '#0d8f5b',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 1.5,
          interactive: false,
        }).addTo(nouveau);
      }

      nouveau.addTo(carte);
      groupe.current = nouveau;
    });

    return () => {
      annule = true;
    };
  }, [donnees, activite, carte]);

  useEffect(
    () => () => {
      groupe.current?.remove();
      groupe.current = null;
    },
    [],
  );

  return null;
}
