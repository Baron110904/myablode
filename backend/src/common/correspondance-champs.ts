import { sansAccents } from './normalisation';

/**
 * Reconnaissance automatique des champs d'un formulaire de collecte.
 *
 * KoboToolbox dérive le nom technique d'une question de son libellé en
 * remplaçant tout caractère non ASCII par un souligné : « Prénom » devient
 * `Pr_nom`, « Glycémie (MG/DL) » devient `Glyc_mie_MG_DL`, « Date de
 * dépistage » devient `Date_de_d_pistage`. Comparer ces noms à une liste
 * écrite en minuscules sans accents échoue donc systématiquement.
 *
 * La reconnaissance se fait ici sur une forme réduite — minuscules, sans
 * accents, sans séparateurs — puis par motifs caractéristiques.
 */

/** Colonnes de `depistages` qu'un champ de formulaire peut alimenter. */
export type ChampCible =
  | 'code_unique'
  | 'nom'
  | 'prenom'
  | 'date_naissance'
  | 'sexe'
  | 'telephone'
  | 'commune_id'
  | 'date_depistage'
  | 'type'
  | 'glycemie'
  | 'imc'
  | 'poids'
  | 'taille'
  | 'resultat'
  | 'oriente_centre'
  | 'notes';

/**
 * Réduit un nom de champ à sa forme comparable.
 *
 * `Groupe/Glyc_mie_MG_DL` → `glycmiemgdl`
 */
export function reduireNomChamp(nom: string): string {
  return sansAccents(nom.split('/').pop() ?? nom)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Règles de reconnaissance, **dans l'ordre**.
 *
 * L'ordre compte : « prnom » contient « nom », et « datededpistage »
 * contient « date ». Les cas les plus spécifiques passent d'abord.
 */
const REGLES: Array<{ cible: ChampCible; teste: (reduit: string) => boolean }> = [
  // Prénom avant nom : « prnom » et « prenom » contiennent tous deux « nom ».
  {
    cible: 'prenom',
    teste: (r) => /^(pr[e]?noms?|firstname|givenname)$/.test(r) || r.startsWith('prnom') || r.startsWith('prenom'),
  },
  // Date de naissance avant date de dépistage : motif « naissance » distinct.
  {
    cible: 'date_naissance',
    teste: (r) => r.includes('naissance') || r.includes('nais') || r.includes('birth') || r.includes('ddn'),
  },
  {
    cible: 'date_depistage',
    teste: (r) =>
      (r.includes('date') || r.includes('jour')) &&
      (r.includes('pistage') || r.includes('depistage') || r.includes('test') || r.includes('screening')),
  },
  {
    cible: 'code_unique',
    teste: (r) => r.includes('code') || r.includes('identifiant') || r.includes('matricule'),
  },
  {
    cible: 'telephone',
    teste: (r) => r.includes('telephone') || r.includes('tlphone') || /^tel/.test(r) || r.includes('phone') || r.includes('contact'),
  },
  {
    cible: 'commune_id',
    teste: (r) => r.includes('commune') || r.includes('municipalit') || r.includes('localite') || r.includes('ville'),
  },
  {
    cible: 'glycemie',
    teste: (r) => r.includes('glyc') || r.includes('sucre') || r.includes('glucose'),
  },
  {
    cible: 'poids',
    teste: (r) => r.includes('poids') || r.includes('weight') || /^kg/.test(r),
  },
  // « taille » avant « imc » : les deux peuvent coexister dans le formulaire.
  {
    cible: 'taille',
    teste: (r) => r.includes('taille') || r.includes('hauteur') || r.includes('height'),
  },
  {
    cible: 'imc',
    teste: (r) => r === 'imc' || r.startsWith('imc') || r.includes('bmi') || r.includes('massecorporelle'),
  },
  {
    cible: 'sexe',
    teste: (r) => r.includes('sexe') || r.includes('genre') || r.includes('gender'),
  },
  {
    cible: 'oriente_centre',
    teste: (r) => r.includes('orient') || r.includes('refer'),
  },
  {
    cible: 'resultat',
    teste: (r) => r.includes('resultat') || r.includes('rsultat') || r.includes('result') || r.includes('conclusion'),
  },
  {
    cible: 'type',
    teste: (r) => r.includes('type') || r.includes('nature'),
  },
  {
    cible: 'notes',
    teste: (r) => r.includes('note') || r.includes('observation') || r.includes('remarque') || r.includes('commentaire'),
  },
  // En dernier : « nom » seul, une fois prénom écarté.
  {
    cible: 'nom',
    teste: (r) => r === 'nom' || r === 'noms' || r.includes('nomcomplet') || r === 'lastname' || r === 'familyname' || r === 'nomdefamille',
  },
];

/**
 * Devine la colonne alimentée par un champ de formulaire.
 * Renvoie `null` quand aucune règle ne s'applique : mieux vaut ignorer un
 * champ que de le ranger dans la mauvaise colonne.
 */
export function deduireChampCible(nomChamp: string): ChampCible | null {
  const reduit = reduireNomChamp(nomChamp);
  if (!reduit) return null;

  // Les métadonnées Kobo ne portent aucune donnée métier.
  if (/^(start|end|today|username|deviceid|simserial|phonenumber|subscriberid|instanceid|rootuuid|uuid|formhubuuid|meta)$/.test(reduit)) {
    return null;
  }

  for (const regle of REGLES) {
    if (regle.teste(reduit)) return regle.cible;
  }
  return null;
}

/**
 * Construit la correspondance complète d'un formulaire.
 * Une cible déjà attribuée n'est pas réutilisée : deux champs ne peuvent pas
 * remplir la même colonne, et le premier reconnu est le plus pertinent.
 */
export function deduireMapping(champs: string[]): Record<string, ChampCible> {
  const mapping: Record<string, ChampCible> = {};
  const prises = new Set<ChampCible>();

  for (const champ of champs) {
    const cible = deduireChampCible(champ);
    if (cible && !prises.has(cible)) {
      mapping[champ] = cible;
      prises.add(cible);
    }
  }
  return mapping;
}
