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
 * Filets de séparation, calés sur la grille ci-dessus.
 *
 * Empilées, les dates se séparent d'un trait horizontal ; côte à côte, d'un
 * trait vertical. Les deux ne peuvent pas cohabiter : un `border-t` laissé
 * en place quand les colonnes s'alignent dessine un trait en l'air au-dessus
 * de chaque cellule. Chaque palier annule donc celui d'avant.
 */
const SEPARATEURS: Record<number, string> = {
  1: '',
  2: '[&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-t-0 sm:[&:not(:first-child)]:border-l',
  3: '[&:not(:first-child)]:border-t lg:[&:not(:first-child)]:border-t-0 lg:[&:not(:first-child)]:border-l',
  4: '[&:not(:first-child)]:border-t sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(2n)]:border-l lg:[&:not(:first-child)]:border-t-0 lg:[&:not(:first-child)]:border-l',
};

/** Mois d'une date, abrégé : « nov. ». */
function moisAbrege(valeur: string): string {
  const d = new Date(`${valeur.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}

/**
 * Bandeau des rendez-vous, sous le bandeau de tête et dans sa continuité.
 *
 * Il tenait sur une carte blanche posée à cheval sur le vert. La refonte le
 * fond dans le bandeau : c'est la suite de la campagne annoncée au-dessus,
 * pas un encadré qui lui passe devant. Le quantième y est composé en très
 * gros - c'est la seule chose qu'on y cherche.
 *
 * `aujourdhui` est calculé une fois par le composant parent et transmis :
 * les mentions « Dans 11 jours » doivent toutes être arrêtées au même
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

  /*
   * Le mois n'est rappelé que s'il change d'une date à l'autre. Tant que le
   * programme tient dans un seul mois - le cas d'une campagne - « 14 » suffit
   * et le répéter alourdit ; dès qu'il l'enjambe, « 5 » et « 14 » ne se
   * situent plus l'un par rapport à l'autre.
   */
  const moisMultiples =
    new Set(dates.map((evenement) => evenement.date_debut.slice(0, 7))).size > 1;

  /*
   * Le rendez-vous mis en avant est le prochain à se tenir - et non la
   * première cellule. Une date passée que l'on garde à l'affiche jusqu'à son
   * heure de retrait arrive en tête du programme : la mettre en avant
   * reviendrait à annoncer comme prochain un rendez-vous déjà terminé.
   */
  const rangProchain = dates.findIndex(
    (evenement) =>
      etatEvenement(evenement.date_debut, evenement.date_fin, aujourdhui).cle !== 'passe',
  );

  return (
    <Reveler delai={120}>
      <ol className={`grid ${COLONNES[dates.length]}`}>
        {dates.map((evenement, rang) => {
          const etat = etatEvenement(evenement.date_debut, evenement.date_fin, aujourdhui);
          const imminent = rang === rangProchain;
          const quantieme = Number(evenement.date_debut.slice(8, 10));

          return (
            <li
              key={evenement.id}
              className={`flex items-center gap-4 border-white/10 px-5 py-5 transition-colors duration-300 sm:px-8 ${
                SEPARATEURS[dates.length]
              } ${
                /*
                  L'opération engagée se détache sur un fond à peine plus
                  clair. C'est ce fond, et la couleur de sa mention, qui la
                  distinguent - pas un quantième éteint.
                */
                imminent ? 'bg-white/[0.07]' : ''
              }`}
            >
              {/*
                Tous les quantièmes en blanc plein. Atténuer ceux des dates
                qui ne sont pas les prochaines les rendait illisibles : c'est
                pourtant le chiffre que l'on vient chercher.
              */}
              <p className="shrink-0 text-center font-extrabold leading-[0.85] tracking-[-0.04em] text-white">
                <span className="block text-[2.5rem] sm:text-[2.75rem]">{quantieme}</span>
                {moisMultiples && (
                  <span className="mt-1 block text-[0.6875rem] font-bold uppercase tracking-[0.1em]">
                    {moisAbrege(evenement.date_debut)}
                  </span>
                )}
              </p>

              <div className="min-w-0">
                <h3 className="text-[0.9375rem] font-bold leading-snug text-white">
                  {evenement.titre}
                </h3>

                {/*
                  Le lieu et le sous-titre, saisis au back-office. Ils
                  figurent aussi sur l'encart « Les grandes dates », qui a la
                  place de les dérouler ; ici ils tiennent sur deux lignes au
                  plus, le bandeau étant une rangée.
                */}
                {(evenement.lieu || evenement.sous_titre) && (
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-white/55">
                    {[evenement.lieu, evenement.sous_titre].filter(Boolean).join(' · ')}
                  </p>
                )}

                <p
                  className={`mt-1 text-[0.8125rem] leading-snug ${
                    imminent ? 'text-ablode-vert-clair' : 'text-white/45'
                  }`}
                >
                  {/*
                    « Terminé » pour une date passée que l'on garde à
                    l'affiche jusqu'à son heure de retrait : elle doit dire
                    qu'elle a eu lieu, pas se faire passer pour à venir.
                  */}
                  {etat.libelle}
                </p>
              </div>
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
            <p className="mt-2.5 text-[0.875rem] font-semibold leading-[1.45] text-white">
              {evenement.description ?? evenement.titre}
            </p>

            {/*
              Le lieu et le sous-titre saisis au back-office se lisent ici,
              et non plus sur le bandeau de tête : celui-ci n'a qu'une ligne
              par date, où ils étaient coupés. L'encart, lui, a la place de
              les montrer en entier.
            */}
            {(evenement.lieu || evenement.sous_titre) && (
              <p className="mt-2 text-[0.8125rem] leading-[1.5] text-white/60">
                {[evenement.lieu, evenement.sous_titre].filter(Boolean).join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
