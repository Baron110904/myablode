import type { FenetreDirect, LigneDirect, SuiviDirect } from '@/lib/types';

/**
 * Générateur de suivi simulé, pour la démonstration de l'écran.
 *
 * Ce module ne prétend rien mesurer. Il existe parce qu'une base de
 * démonstration où tout a été importé d'un coup donne un graphe plat avec un
 * pic unique : impossible de montrer à quoi ressemble l'écran un jour de
 * campagne. L'interface l'annonce explicitement dès qu'il est actif.
 *
 * Les noms de communes viennent du classement réel — ils ne sont pas
 * inventés ; seuls les volumes le sont.
 */

/** Générateur pseudo-aléatoire déterministe : même graine, même courbe. */
function alea(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 0xffffffff;
  };
}

/** Nombre d'intervalles servis par l'API pour chaque fenêtre. */
const INTERVALLES: Record<FenetreDirect, number> = {
  '30s': 31,
  '5min': 31,
  '1h': 31,
  '24h': 37,
  '7j': 43,
};

/** Durée d'un intervalle, en millisecondes. */
const PAS_MS: Record<FenetreDirect, number> = {
  '30s': 1_000,
  '5min': 10_000,
  '1h': 120_000,
  '24h': 2_400_000,
  '7j': 14_400_000,
};

/**
 * Ampleur du flux selon la fenêtre : une campagne active fait arriver
 * quelques dépistages par minute, pas par seconde.
 */
const AMPLITUDE: Record<FenetreDirect, number> = {
  '30s': 3,
  '5min': 9,
  '1h': 26,
  '24h': 210,
  '7j': 620,
};

/**
 * Construit un état de suivi simulé.
 *
 * @param tic      Compteur qui avance à chaque rafraîchissement : c'est lui
 *                 qui fait glisser la courbe vers la gauche.
 * @param communes Communes réelles, reprises du classement de l'API.
 */
export function suiviSimule(
  fenetre: FenetreDirect,
  tic: number,
  communes: LigneDirect[],
  totalCommunes: number,
  maintenant: number,
): SuiviDirect {
  const nb = INTERVALLES[fenetre];
  const pas = PAS_MS[fenetre];
  const ampleur = AMPLITUDE[fenetre];

  const serie = Array.from({ length: nb }, (_, i) => {
    const rang = tic + i;
    const hasard = alea(rang * 2654435761)();

    /*
     * Deux ondulations de périodes différentes plus un peu de bruit : on
     * obtient une courbe qui monte et descend sans se répéter à l'œil, au
     * lieu d'une sinusoïde reconnaissable au premier coup d'œil.
     */
    const houle =
      0.55 + 0.3 * Math.sin(rang / 7.5) + 0.15 * Math.sin(rang / 2.9 + 1.3);
    const depistages = Math.max(
      0,
      Math.round(ampleur * houle + (hasard - 0.5) * ampleur * 0.45),
    );

    // Un cas pour dix à quinze dépistages, avec des intervalles sans aucun cas.
    const cas =
      depistages === 0
        ? 0
        : Math.round(depistages * (0.05 + 0.06 * alea(rang * 40503)()));

    return {
      borne: new Date(maintenant - (nb - 1 - i) * pas).toISOString(),
      depistages,
      cas,
      communes: Math.min(
        totalCommunes,
        Math.max(depistages > 0 ? 1 : 0, Math.round(depistages / 3)),
      ),
    };
  });

  const surFenetre = serie.reduce((somme, p) => somme + p.depistages, 0);
  const casFenetre = serie.reduce((somme, p) => somme + p.cas, 0);

  /*
   * Le classement reprend les communes réelles et leur attribue des arrivées
   * simulées, redistribuées à chaque tic pour que l'ordre bouge.
   */
  const base = communes.length > 0 ? communes : [];
  const classement: LigneDirect[] = base
    .map((ligne, rang) => {
      const tirage = alea((tic * 31 + rang) * 2246822519)();
      const arrivees = Math.round(tirage * ampleur * 0.9);
      const depistages = ligne.depistages + arrivees;
      const cas = ligne.cas + Math.round(arrivees * 0.08);
      return {
        ...ligne,
        arrivees,
        depistages,
        cas,
        taux: depistages > 0 ? Math.round((1000 * cas) / depistages) / 10 : 0,
      };
    })
    .sort((a, b) => b.arrivees - a.arrivees);

  return {
    fenetre,
    horodatage: new Date(maintenant).toISOString(),
    serie,
    surFenetre,
    casFenetre,
    tauxFenetre:
      surFenetre > 0 ? Math.round((1000 * casFenetre) / surFenetre) / 10 : 0,
    communesFenetre: Math.min(
      totalCommunes,
      classement.filter((l) => l.arrivees > 0).length,
    ),
    cumulJour: 4_820 + tic * 7,
    casJour: 361 + Math.round(tic * 0.6),
    communesJour: Math.min(totalCommunes, 34),
    totalCommunes,
    classement,
    dernierSignal:
      classement[0] !== undefined
        ? { commune: classement[0].nom, horodatage: new Date(maintenant).toISOString() }
        : null,
  };
}
