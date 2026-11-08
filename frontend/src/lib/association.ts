/** Coordonnées et présence en ligne de l'ABLODE. */
export const ASSOCIATION = {
  sigle: 'ABLODE',
  nom: 'Association Béninoise de Lutte contre l’Obésité, le Diabète et les Endocrinopathies',
  anneeCreation: 2018,

  /*
   * Pas d'adresse de rue : l'association ne reçoit pas de public à son
   * siège, et la publier n'apporte rien à un visiteur. La commune suffit à
   * la situer, ici comme dans les mentions légales.
   */
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
  /**
   * Fichier du logo, ou `null` tant qu'il n'a pas été fourni.
   *
   * Sans fichier, la bande affiche un cartouche typographique au nom du
   * partenaire. C'est volontaire : reconstituer de mémoire le logo d'un
   * ministère ou d'une institution produirait une marque fausse, affichée
   * comme authentique. Déposer le PNG dans `public/partenaires/` et
   * renseigner le chemin ici suffit à le remplacer.
   */
  logo: string | null;
  /**
   * Nature de la contribution, montrée au survol du logo.
   *
   * Facultative: elle n'est renseignée que pour les partenaires dont le rôle
   * dans les campagnes nous a été confirmé. L'inventer pour les autres
   * reviendrait à publier un engagement qu'ils n'ont pas pris.
   */
  role?: string;
  /**
   * Écart de taille voulu pour ce logo, quand la taille commune le dessert.
   *
   * `grand`: les marques que la taille commune rend illisibles - un emblème
   * circulaire chargé de petits caractères, un dessin au trait fin.
   * `reduit`: les bandeaux si allongés qu'ils prennent toute la largeur de
   * leur case et écrasent leurs voisins.
   *
   * Les régler tous reviendrait à n'en régler aucun: c'est l'écart avec le
   * voisinage qui fait l'effet.
   */
  taille?: 'grand' | 'reduit';
}

export const PARTENAIRES: Partenaire[] = [
  {
    nom: 'Organisation mondiale de la Santé',
    logo: '/partenaires/oms.png',
    role: 'Appui technique',
  },
  {
    nom: 'Gouvernement du Bénin',
    logo: '/partenaires/gouvernement-benin.png',
    role: 'Tutelle institutionnelle',
  },
  {
    nom: 'Ministère de la Santé',
    logo: '/partenaires/ministere-sante.png',
    role: 'Politiques de santé publique',
  },
  {
    nom: 'Programme national de lutte contre les maladies non transmissibles',
    logo: '/partenaires/pnlmnt.png',
  },
  {
    nom: 'LEMACEN',
    logo: '/partenaires/lemacen.jpg',
  },
  {
    nom: 'FSS Cotonou',
    logo: '/partenaires/fss-cotonou.png',
    role: 'Faculté des sciences de la santé',
  },
  {
    nom: 'Clinique Saint Pio',
    logo: '/partenaires/clinique-saint-pio.jpg',
    taille: 'grand',
  },
  {
    nom: 'Centre médical Avicenne',
    logo: '/partenaires/centre-avicenne.jpg',
  },
  {
    nom: 'BioService Santé',
    logo: '/partenaires/bioservice-sante.jpg',
    taille: 'reduit',
  },
  {
    nom: 'UbiPharm Bénin',
    logo: '/partenaires/ubipharm.png',
  },
  {
    nom: 'Celtiis',
    logo: '/partenaires/celtiis.jpeg',
    role: 'Télécommunications',
  },
  {
    nom: 'SBEE',
    logo: '/partenaires/sbee.png',
    role: 'Société Béninoise d’Énergie Électrique',
  },
  {
    nom: 'BIIC',
    logo: '/partenaires/biic.png',
  },
  {
    nom: 'AFG Assurances',
    logo: '/partenaires/afg-assurances.png',
  },
  {
    nom: 'La Générale des Assurances du Bénin',
    logo: '/partenaires/gab.jpg',
  },
  {
    nom: 'ABENES',
    logo: '/partenaires/abenes.jpg',
  },
  {
    nom: 'Golden Tulip Hôtel Le Diplomate',
    logo: '/partenaires/golden-tulip.png',
  },
  {
    nom: 'La Roche',
    logo: '/partenaires/la-roche.jpg',
  },
  {
    nom: 'Jawuntaa',
    logo: '/partenaires/jawuntaa.jpg',
  },
  {
    nom: 'Le Djabi',
    logo: '/partenaires/le-djabi.jpg',
  },
  {
    nom: 'MoriLand City',
    logo: '/partenaires/moriland-city.jpg',
  },
  {
    nom: 'Fifa',
    logo: '/partenaires/fifa.png',
    role: 'Eau minérale naturelle',
  },
  {
    nom: 'Fresh Salad',
    logo: '/partenaires/fresh-salad.png',
    taille: 'grand',
  },
  {
    nom: 'Fitness Corner',
    logo: '/partenaires/fitness-corner.png',
  },
  {
    nom: 'Let’s Go Gym',
    logo: '/partenaires/lets-go-gym.jpg',
    role: 'Activité physique et remise en forme',
  },
  {
    nom: 'Nasuba Infos',
    logo: '/partenaires/nasuba.png',
    role: 'Partenaire média',
  },
  {
    nom: 'Académie de Leadership du Bénin',
    logo: '/partenaires/academie-leadership.jpg',
    taille: 'grand',
  },
  {
    nom: 'Rotaract Dakar Millénium',
    logo: '/partenaires/rotaract.jpg',
    taille: 'grand',
  },
];

/** Lien `tel:` normalisé : sans espaces, comme l'attendent les téléphones. */
export function lienTelephone(numero: string): string {
  return `tel:${numero.replace(/[^\d+]/g, '')}`;
}
