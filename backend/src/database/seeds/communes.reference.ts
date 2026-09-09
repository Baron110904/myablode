/**
 * Référentiel des 77 communes du Bénin réparties dans les 12 départements.
 *
 * `cle` correspond au `shapeName` du fichier geoBoundaries (sans accents) et
 * sert de jointure avec `data/benin-communes.geojson` ; `nom` est le libellé
 * français affiché dans l'interface.
 */
export interface CommuneReference {
  cle: string;
  nom: string;
  departement: string;
}

export const DEPARTEMENTS = [
  'Alibori',
  'Atacora',
  'Atlantique',
  'Borgou',
  'Collines',
  'Couffo',
  'Donga',
  'Littoral',
  'Mono',
  'Ouémé',
  'Plateau',
  'Zou',
] as const;

export const COMMUNES_REFERENCE: CommuneReference[] = [
  // Alibori
  { cle: 'Banikoara', nom: 'Banikoara', departement: 'Alibori' },
  { cle: 'Gogounou', nom: 'Gogounou', departement: 'Alibori' },
  { cle: 'Kandi', nom: 'Kandi', departement: 'Alibori' },
  { cle: 'Karimama', nom: 'Karimama', departement: 'Alibori' },
  { cle: 'Malanville', nom: 'Malanville', departement: 'Alibori' },
  { cle: 'Segbana', nom: 'Ségbana', departement: 'Alibori' },

  // Atacora
  { cle: 'Boukombe', nom: 'Boukoumbé', departement: 'Atacora' },
  { cle: 'Kobli', nom: 'Cobly', departement: 'Atacora' },
  { cle: 'Kerou', nom: 'Kérou', departement: 'Atacora' },
  { cle: 'Kouande', nom: 'Kouandé', departement: 'Atacora' },
  { cle: 'Materi', nom: 'Matéri', departement: 'Atacora' },
  { cle: 'Natitingou', nom: 'Natitingou', departement: 'Atacora' },
  { cle: 'Pehunco', nom: 'Péhunco', departement: 'Atacora' },
  { cle: 'Tanguieta', nom: 'Tanguiéta', departement: 'Atacora' },
  { cle: 'Toucountouna', nom: 'Toucountouna', departement: 'Atacora' },

  // Atlantique
  { cle: 'Abomey-Calavi', nom: 'Abomey-Calavi', departement: 'Atlantique' },
  { cle: 'Allada', nom: 'Allada', departement: 'Atlantique' },
  { cle: 'Kpomasse', nom: 'Kpomassé', departement: 'Atlantique' },
  { cle: 'Ouidah', nom: 'Ouidah', departement: 'Atlantique' },
  { cle: 'So-Ava', nom: 'Sô-Ava', departement: 'Atlantique' },
  { cle: 'Toffo', nom: 'Toffo', departement: 'Atlantique' },
  { cle: 'Tori-Bossito', nom: 'Tori-Bossito', departement: 'Atlantique' },
  { cle: 'Ze', nom: 'Zè', departement: 'Atlantique' },

  // Borgou
  { cle: 'Bembereke', nom: 'Bembèrèkè', departement: 'Borgou' },
  { cle: 'Kalale', nom: 'Kalalé', departement: 'Borgou' },
  { cle: "N'dali", nom: "N'Dali", departement: 'Borgou' },
  { cle: 'Nikki', nom: 'Nikki', departement: 'Borgou' },
  { cle: 'Parakou', nom: 'Parakou', departement: 'Borgou' },
  { cle: 'Perere', nom: 'Pèrèrè', departement: 'Borgou' },
  { cle: 'Sinende', nom: 'Sinendé', departement: 'Borgou' },
  { cle: 'Tchaourou', nom: 'Tchaourou', departement: 'Borgou' },

  // Collines
  { cle: 'Bante', nom: 'Bantè', departement: 'Collines' },
  { cle: 'Dassa-Zoume', nom: 'Dassa-Zoumè', departement: 'Collines' },
  { cle: 'Glazoue', nom: 'Glazoué', departement: 'Collines' },
  { cle: 'Ouesse', nom: 'Ouèssè', departement: 'Collines' },
  { cle: 'Savalou', nom: 'Savalou', departement: 'Collines' },
  { cle: 'Save', nom: 'Savè', departement: 'Collines' },

  // Couffo
  { cle: 'Aplahoue', nom: 'Aplahoué', departement: 'Couffo' },
  { cle: 'Djakotomey', nom: 'Djakotomey', departement: 'Couffo' },
  { cle: 'Dogbo', nom: 'Dogbo', departement: 'Couffo' },
  { cle: 'Klouekanme', nom: 'Klouékanmè', departement: 'Couffo' },
  { cle: 'Lalo', nom: 'Lalo', departement: 'Couffo' },
  { cle: 'Toviklin', nom: 'Toviklin', departement: 'Couffo' },

  // Donga
  { cle: 'Bassila', nom: 'Bassila', departement: 'Donga' },
  { cle: 'Copargo', nom: 'Copargo', departement: 'Donga' },
  { cle: 'Djougou', nom: 'Djougou', departement: 'Donga' },
  { cle: 'Ouake', nom: 'Ouaké', departement: 'Donga' },

  // Littoral
  { cle: 'Cotonou', nom: 'Cotonou', departement: 'Littoral' },

  // Mono
  { cle: 'Athieme', nom: 'Athiémé', departement: 'Mono' },
  { cle: 'Bopa', nom: 'Bopa', departement: 'Mono' },
  { cle: 'Come', nom: 'Comè', departement: 'Mono' },
  { cle: 'Grand-Popo', nom: 'Grand-Popo', departement: 'Mono' },
  { cle: 'Houeyogbe', nom: 'Houéyogbé', departement: 'Mono' },
  { cle: 'Lokossa', nom: 'Lokossa', departement: 'Mono' },

  // Ouémé
  { cle: 'Adjarra', nom: 'Adjarra', departement: 'Ouémé' },
  { cle: 'Adjohoun', nom: 'Adjohoun', departement: 'Ouémé' },
  { cle: 'Aguegues', nom: 'Aguégués', departement: 'Ouémé' },
  { cle: 'Akpo-Misserete', nom: 'Akpro-Missérété', departement: 'Ouémé' },
  { cle: 'Avrankou', nom: 'Avrankou', departement: 'Ouémé' },
  { cle: 'Bonou', nom: 'Bonou', departement: 'Ouémé' },
  { cle: 'Dangbo', nom: 'Dangbo', departement: 'Ouémé' },
  { cle: 'Porto-Novo', nom: 'Porto-Novo', departement: 'Ouémé' },
  { cle: 'Seme-Kpodji', nom: 'Sèmè-Kpodji', departement: 'Ouémé' },

  // Plateau
  { cle: 'Adja-Ouere', nom: 'Adja-Ouèrè', departement: 'Plateau' },
  { cle: 'Ifangni', nom: 'Ifangni', departement: 'Plateau' },
  { cle: 'Ketou', nom: 'Kétou', departement: 'Plateau' },
  { cle: 'Pobe', nom: 'Pobè', departement: 'Plateau' },
  { cle: 'Sakete', nom: 'Sakété', departement: 'Plateau' },

  // Zou
  { cle: 'Abomey', nom: 'Abomey', departement: 'Zou' },
  { cle: 'Agbangnizoun', nom: 'Agbangnizoun', departement: 'Zou' },
  { cle: 'Bohicon', nom: 'Bohicon', departement: 'Zou' },
  { cle: 'Cove', nom: 'Covè', departement: 'Zou' },
  { cle: 'Djidja', nom: 'Djidja', departement: 'Zou' },
  { cle: 'Ouinhi', nom: 'Ouinhi', departement: 'Zou' },
  { cle: 'Za-Kpota', nom: 'Za-Kpota', departement: 'Zou' },
  { cle: 'Zagnanado', nom: 'Zagnanado', departement: 'Zou' },
  { cle: 'Zogbodomey', nom: 'Zogbodomey', departement: 'Zou' },
];

/** Code stable « DDCC » : index du département + rang de la commune. */
export function communeCode(ref: CommuneReference, indexDansDepartement: number): string {
  const dept = String(DEPARTEMENTS.indexOf(ref.departement as never) + 1).padStart(2, '0');
  return `${dept}${String(indexDansDepartement + 1).padStart(2, '0')}`;
}
