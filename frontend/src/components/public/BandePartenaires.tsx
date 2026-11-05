'use client';

import Image from 'next/image';
import { PARTENAIRES, type Partenaire } from '@/lib/association';
import { useAnimationsReduites } from '@/hooks/useAnimationsReduites';

/**
 * Bande de partenaires défilante.
 *
 * Sur grand écran, une seule piste part de la droite vers la gauche. Sur
 * téléphone, deux pistes se croisent : la première moitié des partenaires en
 * haut, la seconde en bas, en sens contraire. Le partage est fait une fois
 * pour toutes, et c'est lui qui garantit qu'un même logo ne peut pas se
 * trouver en haut et en bas au même instant - un simple décalage des
 * animations finirait toujours par les faire coïncider.
 *
 * Au survol, le défilement s'arrête : on ne peut pas lire un nom qui fuit.
 */
export function BandePartenaires() {
  const animationsReduites = useAnimationsReduites();

  if (animationsReduites) {
    /*
     * Mouvement perpétuel refusé par le visiteur : la bande devient une
     * rangée que l'on fait défiler soi-même. Le contenu reste atteignable,
     * ce qu'une animation simplement coupée ne garantirait pas - la moitié
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

  // Partage en deux moitiés, pour les deux pistes du téléphone.
  const moitie = Math.ceil(PARTENAIRES.length / 2);
  const dessus = PARTENAIRES.slice(0, moitie);
  const dessous = PARTENAIRES.slice(moitie);

  return (
    <>
      {/* Téléphone et tablette : deux pistes qui se croisent. */}
      <div className="space-y-4 lg:hidden">
        <Piste partenaires={dessus} />
        <Piste partenaires={dessous} sens="droite" />
      </div>

      {/* Grand écran : une seule piste, tous les partenaires. */}
      <div className="hidden lg:block">
        <Piste partenaires={PARTENAIRES} />
      </div>
    </>
  );
}

function Piste({
  partenaires,
  sens = 'gauche',
}: {
  partenaires: Partenaire[];
  sens?: 'gauche' | 'droite';
}) {
  if (partenaires.length === 0) return null;

  return (
    <div
      className="group relative overflow-hidden"
      /*
       * Présentation seulement : les mêmes partenaires sont énumérés juste
       * après dans une liste réservée aux lecteurs d'écran. Sans ce retrait,
       * chaque nom serait annoncé deux fois - la piste est dupliquée pour
       * boucler.
       */
      aria-hidden
    >
      {/*
        `py-3` n'est pas une respiration décorative : au survol, la carte se
        soulève de quatre pixels et porte une ombre. Collée au bord du cadre
        qui la rogne, elle y perdait son filet vert supérieur, et le survol
        donnait l'impression que la carte passait sous la section du dessus.
      */}
      <div
        className={`flex w-max gap-4 py-3 group-hover:[animation-play-state:paused] ${
          sens === 'droite' ? 'animate-bande-inverse' : 'animate-bande'
        }`}
      >
        {/*
          La liste est écrite deux fois et la piste se décale de la moitié de
          sa largeur : au terme du cycle, la seconde copie se trouve
          exactement là où commençait la première, et la boucle est
          invisible. Tout autre rapport produit un saut à chaque tour.
        */}
        {[0, 1].map((copie) => (
          <div key={copie} className="flex shrink-0 gap-4">
            {partenaires.map((partenaire) => (
              <CartePartenaire key={partenaire.nom} partenaire={partenaire} />
            ))}
          </div>
        ))}
      </div>

      {/* Fondus aux deux bords : la bande sort du cadre au lieu d'y être coupée. */}
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
      /*
        200 px de large, et non 220 : à cette taille, cinq cartes entières et
        le début d'une sixième tiennent dans la largeur du contenu, ce qui
        montre que la bande continue au lieu de s'arrêter net.
      */
      className="flex h-[128px] w-[200px] shrink-0 items-center justify-center rounded-carte border border-ablode-trait bg-white px-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-ablode-vert hover:shadow-carte motion-reduce:hover:translate-y-0"
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
        <div className="flex h-[80px] w-full items-center justify-center">
          <Image
            src={partenaire.logo}
            alt={partenaire.nom}
            width={240}
            height={80}
            className="max-h-[80px] w-auto max-w-full object-contain"
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
