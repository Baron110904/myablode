'use client';

import { useCallback, useEffect, useState } from 'react';
import { typographieFr } from '@/lib/format';
import { Reveler } from './Reveler';

/*
 * Les cinq leçons, telles que l'association les formule.
 *
 * Chaque leçon porte deux écritures : le `titre` est le repère de la liste de
 * gauche, le `texte` est la leçon entière, lue sur la carte. La liste doit
 * pouvoir être parcourue d'un regard ; une carte doit se suffire à elle-même.
 */
const LECONS = [
  {
    titre: 'Manger sain et équilibré',
    texte: 'Manger sain et équilibré : pas trop gras, pas trop salé, pas trop sucré.',
  },
  {
    titre: 'Préférer l’eau',
    texte: 'Préférer un verre d’eau aux boissons sucrées et à la bière.',
  },
  {
    titre: 'Bouger 4 à 5 fois par semaine',
    texte:
      'Faire une activité physique 4 à 5 fois par semaine, pendant 35 à 45 minutes.',
  },
  {
    titre: 'Se faire dépister chaque année',
    texte:
      'Se faire dépister chaque année dès 35 ans, et pour tout enfant en surpoids de plus de 10 ans ou en période de puberté.',
  },
  {
    titre: 'Surveiller poids, tour de taille et tension',
    texte:
      'Contrôler régulièrement son poids, son tour de taille et sa tension artérielle.',
  },
] as const;

/** Cadence : le temps de lire la carte la plus longue sans se presser. */
const DELAI_MS = 4500;

/*
 * L'éventail : chaque carte du dessous est décalée, réduite et inclinée d'un
 * cran de plus. Mesuré sur la maquette, la carte de devant y est parfaitement
 * droite (0,00°) - l'inclinaison vient de celles qui dépassent derrière.
 */
const CRAN_ROTATION = 2;
const CRAN_DECALAGE = 11;
const CRAN_REDUCTION = 0.022;

/**
 * Les cinq leçons de prévention, en cartes qui défilent.
 *
 * Le défilement s'arrête dès que le visiteur s'en occupe - survol, tabulation
 * ou choix d'une leçon dans la liste. Un contenu qui bouge tout seul sans
 * moyen de l'arrêter contrevient au critère WCAG 2.2.2, et surtout il reprend
 * la main au moment précis où l'on essayait de lire.
 *
 * Il ne démarre pas du tout si le système demande à réduire les animations.
 */
export function LeconsPrevention() {
  const [active, setActive] = useState(0);
  const [suspendu, setSuspendu] = useState(false);
  const [choisi, setChoisi] = useState(false);
  const [animations, setAnimations] = useState(true);

  // Préférence système relevée côté client : le rendu serveur ne la connaît
  // pas, et la supposer dans un sens ou dans l'autre serait faux une fois sur
  // deux.
  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const relever = () => setAnimations(!requete.matches);
    relever();
    requete.addEventListener('change', relever);
    return () => requete.removeEventListener('change', relever);
  }, []);

  useEffect(() => {
    if (!animations || suspendu || choisi) return undefined;
    const minuteur = window.setInterval(
      () => setActive((rang) => (rang + 1) % LECONS.length),
      DELAI_MS,
    );
    return () => window.clearInterval(minuteur);
  }, [animations, suspendu, choisi]);

  const choisir = useCallback((rang: number) => {
    setActive(rang);
    setChoisi(true);
  }, []);

  return (
    <section
      className="bg-ablode-vert-voile py-16 sm:py-20"
      aria-labelledby="titre-lecons"
    >
      <div

        className="conteneur grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
        onMouseEnter={() => setSuspendu(true)}
        onMouseLeave={() => setSuspendu(false)}
        onFocusCapture={() => setSuspendu(true)}
        onBlurCapture={() => setSuspendu(false)}
      >
        <Reveler>
          <div>
            <p className="etiquette text-ablode-vert-sombre">Prévention</p>
            <h2
              id="titre-lecons"
              /*
                Interligne plus ample que sur les titres en bas de casse :
                composé en capitales, « ÉVITER LE DIABÈTE » porte ses accents
                au-dessus de la hauteur de capitale, et à 1,05 ils venaient
                buter contre la ligne précédente.
              */
              className="mt-4 text-[2rem] font-extrabold uppercase leading-[1.18] tracking-[-0.02em] sm:text-[2.5rem]"
            >
              Les 5 leçons pour éviter le diabète
            </h2>
            <p className="mt-5 max-w-lg text-[1rem] leading-relaxed text-ablode-gris">
              {typographieFr(
                'Le diabète de type 2 peut être évité ou retardé en adoptant quelques gestes simples au quotidien :',
              )}
            </p>

            {/*
              La liste tient lieu de commande : chaque entrée amène sa leçon
              au premier plan. C'est aussi le moyen d'arrêter le défilement
              exigé par WCAG 2.2.2, sans ajouter un bouton « pause » qui
              n'aurait servi qu'à cela.
            */}
            <ul className="mt-8 space-y-1" role="tablist" aria-orientation="vertical">
              {LECONS.map((lecon, rang) => {
                const actif = rang === active;
                return (
                  <li key={lecon.titre}>
                    <button
                      type="button"
                      role="tab"
                      id={`lecon-onglet-${rang}`}
                      aria-selected={actif}
                      aria-controls={`lecon-carte-${rang}`}
                      onClick={() => choisir(rang)}
                      className="flex w-full items-center gap-4 rounded-full py-2.5 pr-4 text-left transition-colors duration-200 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ablode-vert"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold transition-colors duration-300 ${
                          actif
                            ? 'bg-ablode-vert-vif text-white'
                            : 'bg-white text-ablode-gris'
                        }`}
                      >
                        {rang + 1}
                      </span>
                      <span
                        className={`text-[0.9375rem] leading-snug transition-colors duration-300 ${
                          actif ? 'font-bold text-ablode-encre' : 'text-ablode-gris'
                        }`}
                      >
                        {lecon.titre}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveler>

        <Reveler delai={120}>
          {/*
            Le paquet de cartes. Toutes occupent la même cellule de grille :
            la hauteur du bloc est donc celle de la plus haute, sans hauteur
            fixe à deviner - et la leçon 4, la plus longue, ne déborde pas.
            Le décalage des cartes du dessous est porté par `transform`, qui
            ne compte pas dans la mise en page : elles dépassent du cadre sans
            le déformer.
          */}
          <div className="relative pb-6 pr-6">
            <ul className="grid">
              {LECONS.map((lecon, rang) => {
                // Rang de la carte dans la pile, en partant de celle de devant.
                const profondeur = (rang - active + LECONS.length) % LECONS.length;
                const devant = profondeur === 0;
                const visible = profondeur <= 2;
                /*
                 * Le décalage s'arrête au dernier cran visible. Les cartes du
                 * fond, invisibles, gardaient le leur : une transformation
                 * compte dans la zone défilable même à opacité nulle, et sur
                 * un écran de 320 px la pile poussait la page de neuf pixels
                 * vers la droite.
                 */
                const cran = Math.min(profondeur, 2);

                return (
                  <li
                    key={lecon.titre}
                    id={`lecon-carte-${rang}`}
                    role="tabpanel"
                    aria-labelledby={`lecon-onglet-${rang}`}
                    aria-hidden={!devant}
                    /*
                      Courbe douce des deux côtés plutôt qu'un `ease-out`
                      marqué : celui-ci démarrait sec et s'arrêtait net, et la
                      pile claquait d'une carte à l'autre. Elle part et arrive
                      maintenant sans à-coup, sur 1,1 s - le mouvement se
                      termine bien avant la bascule suivante.
                    */
                    className={`[grid-area:1/1] rounded-carte p-8 transition-[transform,opacity,box-shadow] duration-[1100ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none sm:p-10 ${
                      devant
                        ? 'bg-white shadow-relief'
                        : profondeur === 1
                          ? 'bg-ablode-vert-vif'
                          : 'bg-ablode-profond'
                    }`}
                    style={{
                      transform:
                        `translate(${cran * CRAN_DECALAGE}px, ${cran * CRAN_DECALAGE}px)` +
                        ` rotate(${cran * CRAN_ROTATION}deg)` +
                        ` scale(${1 - cran * CRAN_REDUCTION})`,
                      opacity: visible ? 1 : 0,
                      zIndex: LECONS.length - profondeur,
                    }}
                  >
                    {/*
                      Seule la carte de devant montre son texte. Sans cela,
                      celui des cartes du dessous dépasserait sur leurs bords
                      visibles, et la pile se lirait comme un empilement de
                      brouillons.
                    */}
                    <div
                      /*
                        Le texte s'efface vite et revient lentement, une fois
                        la carte en place : apparu pendant le mouvement, il se
                        lisait en travers de la translation.
                      */
                      className={`transition-opacity ${
                        devant
                          ? 'opacity-100 delay-[450ms] duration-[600ms]'
                          : 'opacity-0 duration-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <span className="text-[3.5rem] font-extrabold leading-none tracking-[-0.04em] text-ablode-vert-vif sm:text-[4rem]">
                          {rang + 1}
                        </span>
                        <span className="etiquette mt-2 text-ablode-gris">
                          Leçon {rang + 1} / {LECONS.length}
                        </span>
                      </div>

                      <p className="mt-10 text-[1.125rem] font-semibold leading-relaxed text-ablode-encre sm:mt-12 sm:text-[1.3125rem]">
                        {typographieFr(lecon.texte)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveler>
      </div>
    </section>
  );
}
