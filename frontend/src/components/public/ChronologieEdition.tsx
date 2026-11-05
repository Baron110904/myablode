import { etatEvenement, jourBenin, periodeEvenement } from '@/lib/format';
import type { Evenement } from '@/lib/types';
import { Reveler } from './Reveler';

/** L’accueil n’en montre jamais plus : au-delà, chaque cellule est illisible. */
const MAX_DATES = 4;

/**
 * Colonnes selon le nombre de dates réellement présentes.
 *
 * Une grille figée à quatre colonnes laissait une cellule blanche vide à
 * droite dès que le programme en comptait trois : la carte paraissait
 * tronquée, alors qu’elle était simplement trop large pour son contenu.
 *
 * Trois dates passent directement d’une colonne à trois, sans l’étape à
 * deux : un 2 + 1 rouvrirait le même trou sur tablette.
 *
 * Les classes sont écrites en toutes lettres. Tailwind ne produit que ce
 * qu’il lit dans les sources : une classe assemblée à l’exécution
 * n’existerait pas dans la feuille de style.
 */
const COLONNES: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * Filets verticaux de la chronologie, calés sur la grille ci-dessus.
 *
 * Ils doivent apparaître aux mêmes paliers, faute de quoi trois dates
 * empilées sur téléphone héritent d’un trait à gauche qui ne sépare rien.
 */
const SEPARATEURS: Record<number, string> = {
  1: '',
  2: 'sm:[&:not(:nth-child(2n+1))]:border-l',
  3: 'lg:[&:not(:first-child)]:border-l',
  4: 'sm:[&:not(:nth-child(2n+1))]:border-l lg:[&:not(:first-child)]:border-l',
};

/**
 * Bandeau chronologique posé à cheval sur le bas du bandeau d'accueil.
 *
 * `aujourdhui` est calculé une fois par le composant parent et transmis :
 * les pastilles « Dans 11 jours » doivent toutes être arrêtées au même
 * instant, sinon deux colonnes rendues de part et d'autre de minuit se
 * contrediraient.
 */
export function ChronologieEdition({
  evenements,
  aujourdhui = jourBenin(),
}: {
  evenements: Evenement[];
  aujourdhui?: string;
}) {
  if (evenements.length === 0) return null;

  const dates = evenements.slice(0, MAX_DATES);

  return (
    <Reveler delai={120}>
      <ol
        className={`grid overflow-hidden rounded-carte border border-ablode-trait bg-white shadow-relief ${
          COLONNES[dates.length]
        }`}
      >
        {dates.map((evenement) => {
          const etat = etatEvenement(evenement.date_debut, evenement.date_fin, aujourdhui);
          const imminent = etat.cle === 'en_cours' || etat.cle === 'aujourdhui';

          return (
            <li
              key={evenement.id}
              /*
                Filet de couleur sur toute la largeur de la cellule, et
                séparateurs qui suivent la grille : un trait à gauche quand
                les colonnes s'alignent, au-dessus quand elles s'empilent.
              */
              className={`group relative border-ablode-trait border-t-4 p-6 transition-colors duration-300 hover:bg-ablode-voile ${
                SEPARATEURS[dates.length]
              } ${
                /*
                  Vert quand l'opération est engagée, bleu tant qu'elle est à
                  venir. La couleur porte l'information : elle se lit d'un
                  coup d'œil, sans comparer deux nuances de vert.
                */
                imminent ? 'border-t-ablode-vert-vif' : 'border-t-ablode-ciel'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Composée dans la famille de texte, et non en monospace :
                    la maquette l'écrit en capitales grasses de la charte. */}
                <p className="text-[0.8125rem] font-bold uppercase tracking-[0.05em] text-ablode-vert-sombre">
                  {periodeEvenement(evenement.date_debut, evenement.date_fin)}
                </p>
                <span
                  className={`pastille ${imminent ? 'pastille-normal' : 'pastille-ciel'}`}
                >
                  {etat.libelle}
                </span>
              </div>

              <h3 className="mt-3 text-[0.9375rem] font-bold leading-snug">
                {evenement.titre}
              </h3>

              {(evenement.sous_titre || evenement.lieu) && (
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ablode-gris">
                  {[evenement.lieu, evenement.sous_titre].filter(Boolean).join(' · ')}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </Reveler>
  );
}

/**
 * Bandeau sombre « Les grandes dates », sous les trois cartes d'action.
 *
 * Le même programme que la chronologie de tête, mais raconté : la
 * chronologie dit où l'on en est, ce bandeau dit ce qui va se passer.
 *
 * Il occupait auparavant une quatrième colonne, haute et étroite, où les
 * descriptions s'étiraient sur six lignes chacune. Déplié sur toute la
 * largeur, l'intitulé tient à gauche et les dates se suivent à droite, dans
 * l'ordre où on les vivra.
 */
export function EncartGrandesDates({
  evenements,
  edition,
}: {
  evenements: Evenement[];
  edition: string | null;
}) {
  if (evenements.length === 0) return null;

  // Le même programme que la chronologie de tête : même borne, donc mêmes
  // dates. Les deux blocs se contrediraient si l’un en montrait une de plus.
  const dates = evenements.slice(0, MAX_DATES);

  return (
    <div className="grid gap-8 rounded-carte bg-ablode-profond p-8 text-white sm:p-10 lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-12">
      <div>
        {/*
          Le titre tient seul : la surmention « Encart » nommait le contenant,
          pas le contenu, et n'apprenait rien à qui lit la page.
        */}
        <h3 className="text-xl font-bold leading-snug tracking-[-0.02em]">
          Les grandes dates{edition ? ` de la ${edition}` : ''}
        </h3>
      </div>

      {/*
        Un filet au-dessus de chaque date plutôt qu'entre elles : sur une
        rangée, un séparateur vertical se confondrait avec les colonnes du
        reste de la page, tandis que ces quatre traits lisent comme une
        frise.
      */}
      <ol className={`grid gap-x-8 gap-y-7 ${COLONNES[dates.length]}`}>
        {dates.map((evenement) => (
          <li key={evenement.id} className="border-t border-white/15 pt-4">
            <p className="text-[0.8125rem] font-bold uppercase leading-snug tracking-[0.03em] text-ablode-vert-clair">
              {periodeEvenement(evenement.date_debut, evenement.date_fin)}
            </p>
            <p className="mt-2.5 text-[0.875rem] leading-[1.5] text-white/70">
              {evenement.description ?? evenement.titre}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
