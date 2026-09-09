import type {
  CategorieArticle,
  ResultatDepistage,
  SourceDepistage,
  StatutCampagne,
  TypeDepistage,
} from './types';

/** Formatage et libellés — une seule source de vérité pour toute l'interface. */

/**
 * Fuseau du Bénin : UTC+1 toute l'année, sans heure d'été.
 *
 * Il est imposé explicitement à chaque formatage. Sans lui, les dates
 * s'afficheraient dans le fuseau du navigateur : un coordinateur consultant
 * la plateforme depuis l'étranger — ou depuis une machine réglée en UTC —
 * verrait des heures de dépistage décalées, et une campagne du 1er du mois
 * pourrait apparaître la veille.
 */
export const FUSEAU_BENIN = 'Africa/Porto-Novo';

export function nombre(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return '—';
  // Intl produit une espace fine insécable (U+202F) que beaucoup de polices,
  // Inter comprise, rendent sans largeur : « 11732 » au lieu de « 11 732 ».
  // L'espace insécable classique (U+00A0) est universellement dessinée.
  return new Intl.NumberFormat('fr-FR').format(valeur).replace(/ /g, ' ');
}

export function pourcentage(valeur: number | null | undefined, decimales = 1): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return '—';
  return `${valeur.toFixed(decimales).replace('.', ',')} %`;
}

export function variation(valeur: number): string {
  if (valeur === 0) return '±0';
  return `${valeur > 0 ? '+' : '−'}${nombre(Math.abs(valeur))}`;
}

export function date(valeur: string | Date | null | undefined): string {
  if (!valeur) return '—';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: FUSEAU_BENIN,
  });
}

export function dateCourte(valeur: string | Date | null | undefined): string {
  if (!valeur) return '—';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: FUSEAU_BENIN,
  });
}

export function dateHeure(valeur: string | Date | null | undefined): string {
  if (!valeur) return '—';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSEAU_BENIN,
  });
}

export function moisAnnee(valeur: string): string {
  // Accepte « AAAA-MM » comme « AAAA-MM-JJ ».
  const d = new Date(valeur.length === 7 ? `${valeur}-01` : valeur);
  if (Number.isNaN(d.getTime())) return valeur;
  return d.toLocaleDateString('fr-FR', {
    month: 'short',
    year: '2-digit',
    timeZone: FUSEAU_BENIN,
  });
}

/** Ancienneté lisible : « il y a 4 min », « il y a 3 j ». */
export function depuis(valeur: string | Date | null | undefined): string {
  if (!valeur) return '—';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '—';

  const secondes = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secondes < 60) return "à l'instant";
  if (secondes < 3600) return `il y a ${Math.floor(secondes / 60)} min`;
  if (secondes < 86400) return `il y a ${Math.floor(secondes / 3600)} h`;
  if (secondes < 2592000) return `il y a ${Math.floor(secondes / 86400)} j`;
  return dateCourte(d);
}

export function age(naissance: string, reference?: string): number | null {
  const debut = new Date(naissance);
  const fin = reference ? new Date(reference) : new Date();
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return null;

  let ans = fin.getFullYear() - debut.getFullYear();
  const mois = fin.getMonth() - debut.getMonth();
  if (mois < 0 || (mois === 0 && fin.getDate() < debut.getDate())) ans -= 1;
  return ans;
}

export const LIBELLES_RESULTAT: Record<ResultatDepistage, string> = {
  normal: 'Normal',
  'pre-diabete': 'Pré-diabète',
  diabete: 'Diabète',
  obesite: 'Obésité',
  autre: 'Autre',
  a_verifier: 'À vérifier',
};

export const LIBELLES_SOURCE: Record<SourceDepistage, string> = {
  kobo: 'Kobo',
  file: 'Fichier',
  manual: 'Manuel',
};

export const LIBELLES_STATUT_CAMPAGNE: Record<StatutCampagne, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  cloturee: 'Clôturée',
};

export const LIBELLES_CATEGORIE: Record<CategorieArticle, string> = {
  campagnes: 'Campagnes',
  sensibilisation: 'Sensibilisation',
  resultats: 'Résultats',
  evenements: 'Événements',
};

/**
 * Première page d'un compte après connexion.
 *
 * Le tableau de bord n'est pas ouvert aux comptes en lecture : les y envoyer
 * les ferait rebondir vers une page vide.
 */
export function pageAccueilRole(role: string): string {
  return role === 'viewer' ? '/admin/depistages' : '/admin';
}

export const LIBELLES_ROLE: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  viewer: 'Membre simple',
};

/** Classe de pastille reflétant la gravité clinique du résultat. */
export function classePastilleResultat(resultat: ResultatDepistage): string {
  switch (resultat) {
    case 'normal':
      return 'pastille pastille-normal';
    case 'pre-diabete':
      return 'pastille pastille-attention';
    case 'diabete':
    case 'obesite':
      return 'pastille pastille-alerte';
    /*
     * Volontairement distinct des trois autres : « à vérifier » ne dit rien
     * de l'état de santé de la personne, seulement que la mesure est
     * inexploitable. Le confondre avec un résultat serait trompeur.
     */
    case 'a_verifier':
      return 'pastille pastille-obesite';
    default:
      return 'pastille pastille-neutre';
  }
}

/**
 * Palier de la choroplèthe. Les seuils reprennent la légende des maquettes ;
 * `palier: null` distingue « aucun dépistage » de « 0 % de prévalence ».
 */
export function paliersPrevalence(
  taux: number,
  depistages: number,
): { couleur: string; palier: number | null } {
  if (depistages === 0) return { couleur: '#eef0ef', palier: null };
  if (taux < 3) return { couleur: '#dcf0e4', palier: 1 };
  if (taux < 5) return { couleur: '#a8dcc0', palier: 2 };
  if (taux < 8) return { couleur: '#6cc496', palier: 3 };
  if (taux <= 11) return { couleur: '#2e9d68', palier: 4 };
  return { couleur: '#12603f', palier: 5 };
}

export const LEGENDE_PREVALENCE = [
  { couleur: '#dcf0e4', libelle: '< 3 %' },
  { couleur: '#a8dcc0', libelle: '3 – 5 %' },
  { couleur: '#6cc496', libelle: '5 – 8 %' },
  { couleur: '#2e9d68', libelle: '8 – 11 %' },
  { couleur: '#12603f', libelle: '> 11 %' },
];

/** Traduit les verbes du journal d'audit en langage courant. */
export const LIBELLES_ACTION: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  restore: 'Restauration',
  archive: 'Archivage',
  import: 'Import de fichier',
  export: 'Export',
  sync: 'Synchronisation Kobo',
  sync_failed: 'Échec de synchronisation',
  test_connexion: 'Test de connexion',
  verify: 'Validation',
  unverify: 'Dévalidation',
  send: 'Envoi de newsletter',
  change_password: 'Changement de mot de passe',
  reset_password: 'Réinitialisation de mot de passe',
  enable_2fa: 'Activation 2FA',
  disable_2fa: 'Désactivation 2FA',
};

export const LIBELLES_ENTITE: Record<string, string> = {
  user: 'Utilisateur',
  depistage: 'Dépistage',
  campagne: 'Campagne',
  article: 'Article',
  communes: 'Communes',
  settings: 'Paramètres',
  kobo: 'Kobo',
  kobo_config: 'Configuration Kobo',
  newsletter: 'Newsletter',
  newsletter_abonne: 'Abonné',
};
