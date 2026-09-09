/**
 * Langues du site vitrine. La langue affichée est négociée depuis l'en-tête
 * `Accept-Language` du navigateur : aucun sélecteur n'est présenté au
 * visiteur, sa préférence système fait foi.
 */
export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];

/** Langue de travail de l'association, et repli quand rien ne correspond. */
export const LANGUE_DEFAUT: Langue = 'fr';

/**
 * Le site est servi en français.
 *
 * L'ABLODE est une association béninoise : son public, ses campagnes et ses
 * partenaires de santé sont francophones. L'anglais reste entièrement traduit
 * (`messages/en.json`) et la négociation ci-dessous est prête à l'emploi, mais
 * elle n'est pas branchée : afficher l'anglais à un visiteur dont le
 * navigateur est configuré en anglais lui masquerait la langue de travail de
 * l'association.
 *
 * Pour laisser le navigateur décider, il suffit d'appeler `negocierLangue`
 * depuis `request.ts` à la place de la constante.
 */
export function langueDuSite(): Langue {
  return LANGUE_DEFAUT;
}

/**
 * Choisit la langue d'après l'en-tête `Accept-Language`, le français primant
 * dès qu'il est accepté — même en second choix.
 *
 * Format attendu : « fr-BJ,fr;q=0.9,en-US;q=0.8 ». Les variantes régionales
 * sont ramenées à leur langue : le contenu ne varie pas d'un pays
 * francophone à l'autre.
 */
export function negocierLangue(acceptLanguage: string | null | undefined): Langue {
  if (!acceptLanguage) return LANGUE_DEFAUT;

  const acceptees = new Set(
    acceptLanguage
      .split(',')
      .map((partie) => {
        const [etiquette, ...parametres] = partie.trim().split(';');
        const facteur = parametres
          .map((parametre) => parametre.trim())
          .find((parametre) => parametre.startsWith('q='));
        const qualite = facteur ? Number.parseFloat(facteur.slice(2)) : 1;
        // Une qualité nulle est un refus explicite de la langue.
        return Number.isFinite(qualite) && qualite > 0
          ? etiquette.trim().toLowerCase().split('-')[0]
          : null;
      })
      .filter((code): code is string => code !== null),
  );

  if (acceptees.has('fr')) return 'fr';
  if (acceptees.has('en')) return 'en';
  return LANGUE_DEFAUT;
}
