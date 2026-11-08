'use client';

import Image from 'next/image';
import { PARTENAIRES, type Partenaire } from '@/lib/association';
import { useAnimationsReduites } from '@/hooks/useAnimationsReduites';

/**
 * Bandes de partenaires défilantes.
 *
 * Deux pistes sur grand écran, trois sur téléphone, en sens alternés. Le
 * partage de la liste est fait une fois pour toutes, et c'est lui - non un
 * décalage des animations - qui garantit qu'un partenaire ne peut jamais
 * paraître sur deux pistes au même instant: chacun n'appartient qu'à une
 * seule. Deux pistes décalées finiraient toujours par coïncider.
 *
 * Le partage respecte l'ordre de la liste, qui va des institutions aux
 * entreprises: une piste reste ainsi cohérente au lieu de mélanger un
 * ministère et une salle de sport.
 *
 * Au survol, le défilement s'arrête: on ne peut pas lire un nom qui fuit.
 */

/** Largeur d'une case, en pixels, telle que posée plus bas par les classes. */
const LARGEUR_CARTE = 200;
const LARGEUR_CARTE_GRANDE = 240;
const ESPACE = 16;

/** Pixels par seconde. Assez lent pour qu'un logo se lise au passage. */
const VITESSE = 48;

/**
 * Les trois gabarits de logo.
 *
 * Écrits en entier, jamais composés morceau par morceau: Tailwind ne garde
 * que les classes qu'il lit littéralement dans le source, et une classe
 * assemblée à l'exécution ne serait jamais produite.
 */
const TAILLES = {
  commune: 'max-h-[80px] max-w-full',
  grand: 'max-h-[96px] max-w-full',
  reduit: 'max-h-[80px] max-w-[70%]',
} as const;

/**
 * Largeur des cartes.
 *
 * La hauteur, elle, ne varie pas: des cartes inégales dans une même rangée
 * se verraient bien avant les logos qu'elles portent. Seule la part que le
 * logo occupe à l'intérieur change, et les quatre marques trop détaillées
 * reçoivent en plus une carte plus large.
 */
const CARTES = {
  commune: 'w-[200px]',
  grand: 'w-[240px]',
  reduit: 'w-[200px]',
} as const;

const CARTE =
  'flex h-[128px] shrink-0 items-center justify-center rounded-carte border' +
  ' border-ablode-trait bg-white px-6 text-center transition-all duration-300' +
  ' hover:-translate-y-1 hover:border-ablode-vert hover:shadow-carte' +
  ' motion-reduce:hover:translate-y-0';

/** Découpe la liste en `nombre` tranches contiguës, sans recouvrement. */
function repartir(partenaires: Partenaire[], nombre: number): Partenaire[][] {
  const taille = Math.ceil(partenaires.length / nombre);
  return Array.from({ length: nombre }, (_, rang) =>
    partenaires.slice(rang * taille, (rang + 1) * taille),
  ).filter((piste) => piste.length > 0);
}

export function BandePartenaires() {
  const animationsReduites = useAnimationsReduites();

  if (animationsReduites) {
    /*
     * Mouvement perpétuel refusé par le visiteur: les bandes deviennent une
     * grille que l'on parcourt des yeux. Le contenu reste atteignable, ce
     * qu'une animation simplement coupée ne garantirait pas - la moitié des
     * logos resterait hors du cadre.
     */
    return (
      <ul className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {PARTENAIRES.map((partenaire) => (
          <li
            key={partenaire.nom}
            title={titre(partenaire)}
            /* En grille, c'est la colonne qui donne la largeur, pas la carte. */
            className={`${CARTE} w-auto`}
          >
            <Logo partenaire={partenaire} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      {/* Téléphone et tablette: trois pistes. */}
      <div className="space-y-4 lg:hidden">
        {repartir(PARTENAIRES, 3).map((piste, rang) => (
          <Piste
            key={piste[0].nom}
            partenaires={piste}
            sens={rang % 2 === 0 ? 'gauche' : 'droite'}
          />
        ))}
      </div>

      {/* Grand écran: deux pistes, les cases y tiennent plus largement. */}
      <div className="hidden space-y-5 lg:block">
        {repartir(PARTENAIRES, 2).map((piste, rang) => (
          <Piste
            key={piste[0].nom}
            partenaires={piste}
            sens={rang % 2 === 0 ? 'gauche' : 'droite'}
          />
        ))}
      </div>

      {/*
        Version lisible par les lecteurs d'écran et les moteurs: les pistes
        sont masquées pour eux, la liste des partenaires ne doit pas
        disparaître avec elles.
      */}
      <ul className="sr-only">
        {PARTENAIRES.map((partenaire) => (
          <li key={partenaire.nom}>{titre(partenaire)}</li>
        ))}
      </ul>
    </>
  );
}

function Piste({
  partenaires,
  sens,
}: {
  partenaires: Partenaire[];
  sens: 'gauche' | 'droite';
}) {
  /*
   * La durée se déduit de la largeur réelle de la piste, et n'est pas posée
   * une fois pour toutes: les pistes n'ont pas le même nombre de cases, et
   * une durée commune les ferait défiler à des vitesses différentes - ce qui
   * se voit immédiatement quand elles sont l'une au-dessus de l'autre.
   */
  const largeur = partenaires.reduce(
    (total, p) => total + (p.taille === 'grand' ? LARGEUR_CARTE_GRANDE : LARGEUR_CARTE) + ESPACE,
    0,
  );

  return (
    <div
      className="group relative overflow-hidden"
      /*
       * Présentation seulement: les mêmes partenaires sont énumérés dans la
       * liste réservée aux lecteurs d'écran. Sans ce retrait, chaque nom
       * serait annoncé deux fois - la piste est dupliquée pour boucler.
       */
      aria-hidden
    >
      <div
        className={`flex w-max gap-4 py-3 group-hover:[animation-play-state:paused] ${
          sens === 'droite' ? 'animate-defilement-inverse' : 'animate-defilement'
        }`}
        style={{ animationDuration: `${Math.round(largeur / VITESSE)}s` }}
      >
        {/*
          La liste est écrite deux fois et la piste se décale de la moitié de
          sa largeur: au terme du cycle, la seconde copie se trouve exactement
          là où commençait la première, et la boucle est invisible. Tout autre
          rapport produit un saut à chaque tour.
        */}
        {[0, 1].map((copie) => (
          <div key={copie} className="flex shrink-0 gap-4">
            {partenaires.map((partenaire) => (
              <div
                key={partenaire.nom}
                title={titre(partenaire)}
                className={`${CARTE} ${CARTES[partenaire.taille ?? 'commune']}`}
              >
                <Logo partenaire={partenaire} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fondus aux deux bords: la bande sort du cadre au lieu d'y être coupée. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ablode-voile to-transparent sm:w-20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ablode-voile to-transparent sm:w-20"
      />
    </div>
  );
}

function Logo({ partenaire }: { partenaire: Partenaire }) {
  if (!partenaire.logo) {
    /*
      Cartouche en attendant le fichier: le nom composé dans la typo de la
      charte, et non un logo reconstitué.
    */
    return (
      <span className="px-3 text-center text-[0.875rem] font-bold leading-snug tracking-[-0.015em] text-ablode-encre">
        {partenaire.nom}
      </span>
    );
  }

  return (
    <Image
      src={partenaire.logo}
      alt={partenaire.nom}
      width={260}
      height={92}
      className={`w-auto object-contain ${TAILLES[partenaire.taille ?? 'commune']}`}
    />
  );
}

/** Nom seul, ou nom et rôle quand celui-ci nous a été confirmé. */
function titre(partenaire: Partenaire): string {
  return partenaire.role ? `${partenaire.nom} · ${partenaire.role}` : partenaire.nom;
}
