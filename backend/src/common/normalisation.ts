import { DepistageType, Sexe } from 'src/database/entities';

/**
 * Normalisation des valeurs venant du terrain.
 *
 * Kobo et les fichiers Excel produisent le même champ sous des formes très
 * variables (« F », « Féminin », « 2 », « female »). Ces fonctions sont
 * partagées par l'import Kobo et l'import de fichiers pour que les deux
 * chemins produisent exactement la même donnée en base.
 */

/**
 * Réduit une valeur de choix à sa forme comparable.
 *
 * KoboToolbox dérive le code d'une réponse de son libellé en remplaçant tout
 * caractère non ASCII par un souligné : « Féminin » devient `f_minin`,
 * « Diabète » devient `diab_te`. Retirer les séparateurs rend ces codes
 * comparables aux libellés attendus.
 */
function reduireValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '';
  return sansAccents(String(valeur))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normaliserSexe(valeur: unknown): Sexe | null {
  const reduit = reduireValeur(valeur);
  if (!reduit) return null;

  // « fminin » vient de Kobo, « feminin » d'une saisie manuelle.
  if (/^(f|w|2|fem|femme|feminin|fminin|female|femelle)$/.test(reduit)) {
    return Sexe.F;
  }
  if (/^(m|h|1|homme|masculin|male|mle)$/.test(reduit)) {
    return Sexe.M;
  }

  // Repli sur la racine, pour les libellés composés (« sexe feminin »).
  if (reduit.startsWith('fem') || reduit.startsWith('fmin')) return Sexe.F;
  if (reduit.startsWith('masc') || reduit.startsWith('homme')) return Sexe.M;

  return null;
}

export function normaliserBooleen(valeur: unknown): boolean {
  if (typeof valeur === 'boolean') return valeur;
  if (valeur === null || valeur === undefined) return false;
  const texte = String(valeur).trim().toLowerCase();
  return ['1', 'true', 'vrai', 'oui', 'yes', 'o', 'y', 'x'].includes(texte);
}

/**
 * Accepte AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA et les numéros de série Excel.
 * Renvoie une date ISO (AAAA-MM-JJ) ou null si la valeur est inexploitable.
 */
export function normaliserDate(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;

  if (valeur instanceof Date && !Number.isNaN(valeur.getTime())) {
    return versIso(valeur);
  }

  // Excel stocke les dates en nombre de jours depuis le 30/12/1899.
  if (typeof valeur === 'number' && valeur > 20000 && valeur < 60000) {
    const date = new Date(Date.UTC(1899, 11, 30) + valeur * 86_400_000);
    return Number.isNaN(date.getTime()) ? null : versIso(date);
  }

  const texte = String(valeur).trim();
  if (!texte) return null;

  const iso = texte.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const francais = texte.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (francais) {
    const [, jour, mois, annee] = francais;
    return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
  }

  const date = new Date(texte);
  return Number.isNaN(date.getTime()) ? null : versIso(date);
}

/** Accepte la virgule décimale et les unités collées (« 126 mg/dL »). */
export function normaliserNombre(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;

  const texte = String(valeur)
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.\-]/g, '');
  if (!texte) return null;

  const nombre = Number(texte);
  return Number.isFinite(nombre) ? nombre : null;
}

export function normaliserType(valeur: unknown): DepistageType | null {
  const reduit = reduireValeur(valeur);
  if (!reduit) return null;

  // « diabte » et « obsit » sont les formes produites par Kobo, privées de
  // leurs voyelles accentuées.
  if (reduit.includes('diab')) return DepistageType.DIABETE;
  if (reduit.includes('obes') || reduit.includes('obsit')) {
    return DepistageType.OBESITE;
  }
  if (reduit.includes('endocrin') || reduit.includes('glande')) {
    return DepistageType.ENDOCRINOPATHIE;
  }
  return null;
}

export function normaliserTexte(valeur: unknown, longueurMax: number): string | null {
  if (valeur === null || valeur === undefined) return null;
  const texte = String(valeur).trim();
  return texte ? texte.slice(0, longueurMax) : null;
}

export function sansAccents(texte: string): string {
  // \p{M} = marques combinantes ; NFD les sépare de leur lettre de base.
  return texte.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Réduit un libellé à une forme utilisable dans une URL ou un nom de fichier.
 * Sert aux adresses d'articles et aux noms des exports téléchargés.
 */
export function slugifier(texte: string): string {
  return sansAccents(texte)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/**
 * Glycémie en mg/dL, avec conversion depuis les g/L.
 *
 * Une valeur inférieure à 10 ne peut pas être des mg/dL : elle est
 * interprétée comme des g/L, l'unité des glucomètres francophones.
 */
export function normaliserGlycemie(valeur: unknown): number | null {
  const nombre = normaliserNombre(valeur);
  if (nombre === null) return null;
  if (nombre > 0 && nombre < 10) return Math.round(nombre * 100 * 100) / 100;
  return nombre;
}

function versIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Bornes de vraisemblance physiologique.
 *
 * Elles ne refusent rien et ne décident d'aucun résultat : elles disent
 * seulement qu'une valeur sort du domaine du plausible et demande un
 * contrôle humain. Les seuils qui décident du résultat clinique sont dans
 * la table `settings`, et sont d'une autre nature.
 */
export const BORNES_VRAISEMBLANCE = {
  /** Une glycémie capillaire mesurable va d'environ 20 à 900 mg/dL. */
  glycemie: { min: 20, max: 900, unite: 'mg/dL' },
  /** Un IMC humain reste entre 8 et 90 kg/m². */
  imc: { min: 8, max: 90, unite: 'kg/m²' },
  /** Du nourrisson au cas extrême : 2 à 400 kg. */
  poids: { min: 2, max: 400, unite: 'kg' },
  /** En centimètres, comme relevé sur le terrain. */
  taille: { min: 30, max: 250, unite: 'cm' },
} as const;

/**
 * IMC à partir du poids et de la taille : `poids / taille²`.
 *
 * La taille est attendue en centimètres, comme sur le terrain — un agent
 * relève « 168 », pas « 1,68 ». La conversion en mètres est faite ici, une
 * seule fois, plutôt que laissée à chaque appelant.
 *
 * Renvoie `null` si l'une des deux mesures manque : mieux vaut pas d'IMC
 * qu'un IMC faux. Aucune borne n'est appliquée ici — une mesure aberrante
 * donne un IMC aberrant, que `motifHorsNorme` signalera.
 */
export function calculerImc(
  poids: number | null,
  taille: number | null,
): number | null {
  if (poids === null || taille === null || taille <= 0) return null;
  const metres = taille / 100;
  return Math.round((poids / (metres * metres)) * 100) / 100;
}

/**
 * Motif de signalement d'une mesure, ou null si tout est dans les bornes.
 *
 * Le motif est enregistré tel quel : il sert de consigne de vérification à
 * l'équipe, pas de message d'erreur à l'agent de terrain — la ligne est
 * déjà acceptée quand il s'affiche.
 */
export function motifHorsNorme(
  glycemie: number | null,
  imc: number | null,
  poids: number | null = null,
  taille: number | null = null,
): string | null {
  const motifs: string[] = [];

  const verifier = (
    libelle: string,
    valeur: number | null,
    borne: { readonly min: number; readonly max: number; readonly unite: string },
  ) => {
    if (valeur !== null && (valeur < borne.min || valeur > borne.max)) {
      motifs.push(
        `${libelle} ${valeur} ${borne.unite} hors des bornes ${borne.min}–${borne.max}`,
      );
    }
  };

  verifier('glycémie', glycemie, BORNES_VRAISEMBLANCE.glycemie);
  verifier('IMC', imc, BORNES_VRAISEMBLANCE.imc);
  verifier('poids', poids, BORNES_VRAISEMBLANCE.poids);
  verifier('taille', taille, BORNES_VRAISEMBLANCE.taille);

  return motifs.length > 0 ? motifs.join(' ; ') : null;
}
