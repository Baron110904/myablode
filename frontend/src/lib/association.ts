/** Coordonnées et présence en ligne de l'ABLODE. */
export const ASSOCIATION = {
  sigle: 'ABLODE',
  nom: 'Association Béninoise de Lutte contre l’Obésité, le Diabète et les Endocrinopathies',
  anneeCreation: 2018,

  adresse: 'Lot 27, Parcelle F Sedegbe — Maison Sessinou Blanche',
  ville: 'Abomey-Calavi',
  pays: 'Bénin',

  /** Deux lignes actives ; l'indicatif du Bénin est le +229. */
  telephones: ['+229 65 50 86 45', '+229 90 00 34 54'],
};

export interface ReseauSocial {
  nom: string;
  url: string;
  logo: string;
  /** Intitulé de l'action, lu par les lecteurs d'écran. */
  action: string;
}

export const RESEAUX_SOCIAUX: ReseauSocial[] = [
  {
    nom: 'Facebook',
    url: 'https://www.facebook.com/ABLODEOfficiel',
    logo: '/reseaux/facebook.png',
    action: 'Suivre l’ABLODE sur Facebook',
  },
  {
    nom: 'Instagram',
    url: 'https://www.instagram.com/ablode_officiel/',
    logo: '/reseaux/instagram.png',
    action: 'Suivre l’ABLODE sur Instagram',
  },
  {
    nom: 'WhatsApp',
    url: 'https://chat.whatsapp.com/D0K8U2lRhInE80tOqJkSrF',
    logo: '/reseaux/whatsapp.png',
    action: 'Rejoindre le groupe WhatsApp de l’ABLODE',
  },
];

export interface Partenaire {
  nom: string;
  logo: string;
  /** Nature de la contribution, affichée sous le logo. */
  role: string;
}

export const PARTENAIRES: Partenaire[] = [
  {
    nom: 'FSS Cotonou',
    logo: '/partenaires/fss-cotonou.png',
    role: 'Faculté des sciences de la santé',
  },
  {
    nom: 'SBEE',
    logo: '/partenaires/sbee.png',
    role: 'Société Béninoise d’Énergie Électrique',
  },
  {
    // Marque béninoise d'eau minérale, sans lien avec la fédération de football.
    nom: 'Fifa',
    logo: '/partenaires/fifa.png',
    role: 'Eau minérale naturelle',
  },
  {
    nom: 'Let’s Go Gym',
    logo: '/partenaires/lets-go-gym.jpg',
    role: 'Activité physique et remise en forme',
  },
];

/** Lien `tel:` normalisé : sans espaces, comme l'attendent les téléphones. */
export function lienTelephone(numero: string): string {
  return `tel:${numero.replace(/[^\d+]/g, '')}`;
}
