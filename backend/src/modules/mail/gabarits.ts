/**
 * Gabarits des messages envoyés par la plateforme.
 *
 * Chaque message a un objet et un corps modifiables depuis Paramètres → Mail.
 * Les valeurs ci-dessous servent de texte de départ et de repli : un gabarit
 * effacé revient à celui-ci plutôt que de partir vide.
 *
 * Les variables s'écrivent `{{nom}}`. Une variable inconnue est laissée telle
 * quelle dans le message : mieux vaut un accroc visible dans un courriel qu'un
 * trou silencieux à l'endroit du prénom.
 */

export interface Gabarit {
  /** Clé de stockage dans `settings`. */
  cle: string;
  libelle: string;
  description: string;
  /** Variables utilisables, avec ce qu'elles contiennent. */
  variables: Array<{ nom: string; role: string }>;
  sujet: string;
  corps: string;
}

export const GABARITS: Gabarit[] = [
  {
    cle: 'mail_reinitialisation',
    libelle: 'Réinitialisation de mot de passe',
    description: 'Envoyé à un administrateur qui demande un nouveau mot de passe.',
    variables: [
      { nom: 'lien', role: 'Adresse de réinitialisation, valable une heure' },
      { nom: 'duree', role: 'Durée de validité du lien' },
    ],
    sujet: 'MyABLODE — Réinitialisation de votre mot de passe',
    corps:
      '<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>' +
      '<p>Ce lien est valable {{duree}}. Passé ce délai, il faudra en demander un nouveau.</p>' +
      '<p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : ' +
      'votre mot de passe reste inchangé.</p>',
  },
  {
    cle: 'mail_accuse_contact',
    libelle: 'Accusé de réception d’un message',
    description: 'Confirmation aux personnes qui écrivent via le formulaire de contact.',
    variables: [{ nom: 'nom', role: 'Nom saisi dans le formulaire' }],
    sujet: 'MyABLODE — Nous avons bien reçu votre message',
    corps:
      '<p>Votre message est bien arrivé à l’ABLODE. Notre équipe vous répondra ' +
      'dans les meilleurs délais.</p>',
  },
  {
    cle: 'mail_confirmation_benevole',
    libelle: 'Confirmation de candidature',
    description: 'Accusé de réception aux personnes qui se proposent comme bénévoles.',
    variables: [{ nom: 'prenom', role: 'Prénom du candidat' }],
    sujet: 'MyABLODE — Votre candidature de bénévole',
    corps:
      '<p>Merci pour votre candidature. Un membre de l’équipe vous contactera ' +
      'pour vous présenter les prochaines campagnes de dépistage près de chez ' +
      'vous.</p>',
  },
  {
    cle: 'mail_acceptation_benevole',
    libelle: 'Candidature acceptée',
    description:
      'Envoyé quand une candidature est acceptée. Ne contient aucun identifiant : ' +
      'ils sont remis en main propre.',
    variables: [{ nom: 'prenom', role: 'Prénom du bénévole' }],
    sujet: 'MyABLODE — Bienvenue parmi les bénévoles de l’ABLODE',
    corps:
      '<p>Votre candidature est retenue. Bienvenue dans l’équipe des bénévoles ' +
      'de l’ABLODE.</p>' +
      '<p>Nous vous accueillerons lors de la prochaine campagne pour vous ' +
      'présenter le déroulé d’un poste de dépistage.</p>',
  },
  {
    cle: 'mail_alerte_synchronisation',
    libelle: 'Alerte de synchronisation',
    description:
      'Prévient les administrateurs d’un échec répété de la récupération des ' +
      'données de terrain.',
    variables: [
      { nom: 'motif', role: 'Raison de l’échec, telle que remontée' },
      { nom: 'echecs', role: 'Nombre d’échecs consécutifs' },
    ],
    sujet: 'MyABLODE — Échec de la synchronisation des données',
    corps:
      '<p>La récupération des données de terrain a échoué {{echecs}} fois de suite.</p>' +
      '<p>Motif signalé : {{motif}}</p>' +
      '<p>Vérifiez la configuration de la collecte et la connexion réseau du serveur.</p>',
  },
];

/** Gabarit par sa clé, ou `undefined` si la clé est inconnue. */
export function gabaritParCle(cle: string): Gabarit | undefined {
  return GABARITS.find((g) => g.cle === cle);
}

/**
 * Remplace les `{{variables}}` par leurs valeurs.
 *
 * Les valeurs sont échappées : un nom contenant `<` ou `&` ne doit pas casser
 * le HTML du courriel, ni y injecter de balise. Seules les variables
 * explicitement marquées comme déjà sûres — un lien construit par le serveur —
 * échappent à ce traitement.
 */
export function remplirGabarit(
  modele: string,
  valeurs: Record<string, string>,
  brutes: string[] = [],
): string {
  return modele.replace(/\{\{\s*(\w+)\s*\}\}/g, (entier, nom: string) => {
    const valeur = valeurs[nom];
    if (valeur === undefined) return entier;
    return brutes.includes(nom) ? valeur : echapperTexte(valeur);
  });
}

function echapperTexte(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
