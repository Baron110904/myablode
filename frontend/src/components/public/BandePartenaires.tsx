'use client';

import Image from 'next/image';
import { PARTENAIRES, type Partenaire } from '@/lib/association';
import { useAnimationsReduites } from '@/hooks/useAnimationsReduites';

/**
 * Bande de partenaires défilant de la droite vers la gauche.
 *
 * La liste est écrite deux fois et la piste se décale de la moitié de sa
 * largeur : au terme du cycle, la seconde copie se trouve exactement là où
 * commençait la première, et la boucle est invisible. Tout autre rapport
 * produit un saut à chaque tour.
 *
 * Au survol, le défilement s'arrête — on ne peut pas lire un nom qui fuit.
 */
export function BandePartenaires() {
  const animationsReduites = useAnimationsReduites();

  if (animationsReduites) {
    /*
     * Mouvement perpétuel refusé par le visiteur : la bande devient une
     * rangée que l'on fait défiler soi-même. Le contenu reste atteignable,
     * ce qu'une animation simplement coupée ne garantirait pas — la moitié
     * des logos serait hors du cadre.
     */
    return (
      <div className="flex gap-4 overflow-x-auto px-5 pb-2 sm:px-8" aria-hidden>
        {PARTENAIRES.map((partenaire) => (
          <CartePartenaire key={partenaire.nom} partenaire={partenaire} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden"
      /*
       * Présentation seulement : les mêmes partenaires sont énumérés juste
       * après dans une liste réservée aux lecteurs d'écran. Sans ce retrait,
       * chaque nom serait annoncé deux fois — la piste est dupliquée pour
       * boucler.
       */
      aria-hidden
    >
      <div className="flex w-max animate-bande gap-4 group-hover:[animation-play-state:paused]">
        {[0, 1].map((copie) => (
          <div key={copie} className="flex shrink-0 gap-4">
            {PARTENAIRES.map((partenaire) => (
              <CartePartenaire key={partenaire.nom} partenaire={partenaire} />
            ))}
          </div>
        ))}
      </div>

      {/* Fondus aux deux bords : la bande sort du cadre au lieu d'y être coupée. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-ablode-voile to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ablode-voile to-transparent"
      />
    </div>
  );
}

function CartePartenaire({ partenaire }: { partenaire: Partenaire }) {
  return (
    <div
      /*
        La carte ne porte plus que le logo : un partenaire se reconnaît à sa
        marque, et répéter son nom dessous ajoutait une ligne de texte que
        personne ne lisait dans une bande qui défile. Le rôle reste accessible
        au survol, et la liste masquée de la page le donne aux lecteurs
        d'écran.
      */
      title={`${partenaire.nom} · ${partenaire.role}`}
      className="flex h-[132px] w-[220px] shrink-0 items-center justify-center rounded-carte border border-ablode-trait bg-white px-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-ablode-vert hover:shadow-carte motion-reduce:hover:translate-y-0"
    >
      {partenaire.logo ? (
        /*
          Les logos fournis vont du carré au bandeau très allongé - de 1:1
          pour Celtiis à 6:1 pour Nasuba. La boîte borne donc les deux
          dimensions et `object-contain` fait le reste : chacun occupe la
          place qu'il peut sans être déformé ni déborder de la carte. Avec
          une seule contrainte de hauteur, les logos larges sortaient du
          cadre et les carrés restaient minuscules.
        */
        <div className="flex h-[84px] w-full items-center justify-center">
          <Image
            src={partenaire.logo}
            alt={partenaire.nom}
            width={240}
            height={84}
            className="max-h-[84px] w-auto max-w-full object-contain"
          />
        </div>
      ) : (
        /*
          Cartouche en attendant le fichier : le nom composé dans la typo de
          la charte, et non un logo reconstitué.
        */
        <span className="text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] text-ablode-encre">
          {partenaire.nom}
        </span>
      )}
    </div>
  );
}
