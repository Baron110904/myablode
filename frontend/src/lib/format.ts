import type {
  CategorieArticle,
  CategorieVideo,
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
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return '-';
  // Intl produit une espace fine insécable (U+202F) que beaucoup de polices,
  // Inter comprise, rendent sans largeur : « 11732 » au lieu de « 11 732 ».
  // L'espace insécable classique (U+00A0) est universellement dessinée.
  return new Intl.NumberFormat('fr-FR').format(valeur).replace(/ /g, ' ');
}

export function pourcentage(valeur: number | null | undefined, decimales = 1): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return '-';
  return `${valeur.toFixed(decimales).replace('.', ',')} %`;
}

export function variation(valeur: number): string {
  if (valeur === 0) return '±0';
  return `${valeur > 0 ? '+' : '−'}${nombre(Math.abs(valeur))}`;
}

export function date(valeur: string | Date | null | undefined): string {
  if (!valeur) return '-';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: FUSEAU_BENIN,
  });
}

export function dateCourte(valeur: string | Date | null | undefined): string {
  if (!valeur) return '-';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: FUSEAU_BENIN,
  });
}

export function dateHeure(valeur: string | Date | null | undefined): string {
  if (!valeur) return '-';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '-';
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
  if (!valeur) return '-';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '-';

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

export const LIBELLES_CATEGORIE_VIDEO: Record<CategorieVideo, string> = {
  depistage: 'Dépistage',
  evenement: 'Événement',
  prevention: 'Prévention',
  campagne: 'Campagne',
};

// ─── Programme de l'édition ──────────────────────────────────────────────────

/**
 * Jour civil au Bénin, au format AAAA-MM-JJ.
 *
 * Le calcul du « dans combien de jours » doit se faire en jours civils, pas
 * en tranches de 24 heures : à 23 h, un événement du lendemain matin est
 * « demain », pas « dans 0 jour ». La locale `en-CA` rend directement le
 * format ISO, sans recomposition manuelle.
 */
export function jourBenin(valeur: Date | string = new Date()): string {
  const d = typeof valeur === 'string' ? new Date(valeur) : valeur;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: FUSEAU_BENIN });
}

/** Nombre de jours civils entre deux dates AAAA-MM-JJ. */
function ecartEnJours(depuisJour: string, versJour: string): number {
  const a = Date.parse(`${depuisJour}T00:00:00Z`);
  const b = Date.parse(`${versJour}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export interface EtatEvenement {
  cle: 'en_cours' | 'aujourdhui' | 'a_venir' | 'passe';
  libelle: string;
}

/**
 * Pastille d'un événement du programme : « En cours », « Dans 11 jours »…
 *
 * `aujourdhui` est un paramètre et non `new Date()` interne : la fonction est
 * appelée côté serveur, et la rendre pure la laisse testable sans geler
 * l'horloge.
 */
export function etatEvenement(
  dateDebut: string,
  dateFin: string | null,
  aujourdhui: string = jourBenin(),
): EtatEvenement {
  const debut = dateDebut.slice(0, 10);
  const fin = (dateFin ?? dateDebut).slice(0, 10);

  if (fin < aujourdhui) return { cle: 'passe', libelle: 'Terminé' };
  // Opération entamée et pas encore close : c'est le seul cas « en cours ».
  if (debut < aujourdhui) return { cle: 'en_cours', libelle: 'En cours' };
  if (debut === aujourdhui) return { cle: 'aujourdhui', libelle: 'Aujourd’hui' };

  const jours = ecartEnJours(aujourdhui, debut);
  return {
    cle: 'a_venir',
    libelle: jours === 1 ? 'Demain' : `Dans ${jours} jours`,
  };
}

/**
 * Période d'un événement, en capitales dans le bandeau : « 5 NOVEMBRE »,
 * « 1ᵉʳ – 30 NOV. ». Le premier du mois s'écrit « 1ᵉʳ » en français.
 */
export function periodeEvenement(dateDebut: string, dateFin: string | null): string {
  const debut = new Date(`${dateDebut.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(debut.getTime())) return '';

  const jour = (d: Date) => {
    const numero = Number(d.toLocaleDateString('en-CA', { timeZone: 'UTC' }).slice(8));
    return numero === 1 ? '1ᵉʳ' : String(numero);
  };
  const mois = (d: Date, abrege: boolean) =>
    d.toLocaleDateString('fr-FR', { month: abrege ? 'short' : 'long', timeZone: 'UTC' });

  if (!dateFin || dateFin.slice(0, 10) === dateDebut.slice(0, 10)) {
    return `${jour(debut)} ${mois(debut, false)}`;
  }

  const fin = new Date(`${dateFin.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(fin.getTime())) return `${jour(debut)} ${mois(debut, false)}`;

  // Même mois : il ne s'écrit qu'une fois, « 1ᵉʳ – 30 nov. ».
  const memeMois = mois(debut, true) === mois(fin, true);
  return memeMois
    ? `${jour(debut)} – ${jour(fin)} ${mois(fin, true)}`
    : `${jour(debut)} ${mois(debut, true)} – ${jour(fin)} ${mois(fin, true)}`;
}

/*
 * Le libellé d'édition est saisi librement au back-office. « 6ᵉ édition »,
 * « 6ème édition », « 6e édition » désignent la même chose, mais ne se
 * composent pas de la même façon : un « ème » en toute lettre occupe trois
 * caractères de titre et fait passer le bloc sous le titre, là où un
 * exposant tient à côté. La saisie est donc ramenée à sa forme canonique à
 * l'affichage, plutôt que d'exiger de l'administrateur qu'il tape un
 * caractère exposant que son clavier ne porte pas.
 */
const EXPOSANTS: Record<string, string> = { e: 'ᵉ', re: 'ʳᵉ', er: 'ᵉʳ' };

function exposantCanonique(numero: string, saisi: string): string {
  // « ᵉʳ » et « ʳᵉ » sont ramenés à « er » et « re » avant comparaison.
  const nu = saisi.toLowerCase().replace(/ᵉ/g, 'e').replace(/ʳ/g, 'r');
  if (/^(ere|ère|re)$/.test(nu)) return 're';
  if (/^er$/.test(nu)) return 'er';
  if (/^(eme|ème|e)$/.test(nu)) return 'e';
  // Rien de lisible : « 1re édition » au féminin, « 6e » au-delà.
  return numero === '1' ? 're' : 'e';
}

/**
 * Numéro d'édition et son exposant, séparés pour être composés à deux
 * tailles dans le bandeau d'accueil.
 *
 * Renvoie `null` quand le libellé ne commence pas par un nombre : un intitulé
 * libre est alors affiché tel quel, sans être tronqué.
 */
export function decomposerEdition(
  libelle: string | null | undefined,
): { numero: string; exposant: string } | null {
  if (!libelle) return null;
  const sansLeMot = libelle.replace(/\s*éditions?\s*$/i, '').trim();
  const trouve = sansLeMot.match(/^(\d{1,3})\s*([a-zèéêᵉʳ]*)$/i);
  if (!trouve) return null;
  return { numero: trouve[1], exposant: exposantCanonique(trouve[1], trouve[2]) };
}

/** Libellé d'édition pour une lecture en ligne : « 6ᵉ édition ». */
export function editionNormalisee(
  libelle: string | null | undefined,
): string | null {
  const parts = decomposerEdition(libelle);
  if (!parts) return libelle?.trim() || null;
  return `${parts.numero}${EXPOSANTS[parts.exposant]} édition`;
}

// ─── Vidéos ──────────────────────────────────────────────────────────────────

/** Durée d'une vidéo au format « 3:42 » ou « 1:04:08 ». */
export function duree(secondes: number | null | undefined): string {
  if (secondes === null || secondes === undefined || !Number.isFinite(secondes)) {
    return '-';
  }
  const total = Math.max(0, Math.round(secondes));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = total % 60;

  const paire = (valeur: number) => String(valeur).padStart(2, '0');
  return heures > 0
    ? `${heures}:${paire(minutes)}:${paire(reste)}`
    : `${minutes}:${paire(reste)}`;
}

/** Poids d'un fichier, en unité lisible. */
export function tailleFichier(octets: number | string | null | undefined): string {
  const valeur = typeof octets === 'string' ? Number(octets) : octets;
  if (valeur === null || valeur === undefined || !Number.isFinite(valeur)) return '-';
  if (valeur < 1024) return `${valeur} o`;

  const unites = ['ko', 'Mo', 'Go'];
  let taille = valeur / 1024;
  let rang = 0;
  while (taille >= 1024 && rang < unites.length - 1) {
    taille /= 1024;
    rang += 1;
  }
  return `${taille.toFixed(taille < 10 ? 1 : 0).replace('.', ',')} ${unites[rang]}`;
}

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
  video: 'Vidéo',
  evenement: 'Événement',
  communes: 'Communes',
  settings: 'Paramètres',
  kobo: 'Kobo',
  kobo_config: 'Configuration Kobo',
  newsletter: 'Newsletter',
  newsletter_abonne: 'Abonné',
};
