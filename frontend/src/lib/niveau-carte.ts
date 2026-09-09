import type { NiveauCarte } from './types';

/**
 * Choix du découpage territorial en fonction du zoom.
 *
 * Vu du pays entier, 77 communes forment une mosaïque illisible et leurs
 * effectifs sont trop faibles pour être comparés d'un coup d'œil ; on montre
 * donc les 12 départements. En approchant, le détail communal reprend le
 * dessus.
 *
 * Les deux seuils diffèrent volontairement. Avec un seuil unique, un zoom qui
 * s'arrête pile dessus ferait basculer la carte à chaque micro-ajustement —
 * et chaque bascule est un rechargement. Cette zone morte de 0,4 niveau exige
 * un mouvement franc pour changer de découpage.
 */
const ENTREE_COMMUNE = 7.5;
const RETOUR_DEPARTEMENT = 7.1;

export function niveauPourZoom(zoom: number, actuel: NiveauCarte): NiveauCarte {
  if (actuel === 'departement') {
    return zoom >= ENTREE_COMMUNE ? 'commune' : 'departement';
  }
  return zoom < RETOUR_DEPARTEMENT ? 'departement' : 'commune';
}

/** Libellé au singulier, pour nommer ce qui est survolé ou sélectionné. */
export function libelleNiveau(niveau: NiveauCarte): string {
  return niveau === 'departement' ? 'Département' : 'Commune';
}
