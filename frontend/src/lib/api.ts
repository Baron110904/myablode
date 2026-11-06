import { typographieFrProfonde } from './format';
import type { Utilisateur } from './types';

/**
 * Client HTTP de l'API MyABLODE.
 *
 * Deux usages distincts :
 * — `apiPublic` : appelé depuis les Server Components du site vitrine, sans
 *   jeton, avec revalidation ISR (chiffres rafraîchis toutes les 5 minutes,
 *   conformément à la section 3.1.1).
 * — `apiAdmin`  : appelé côté navigateur avec le jeton d'accès en mémoire.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Adresse absolue d'un fichier déposé depuis le back-office.
 *
 * L'API renvoie un chemin relatif (`/uploads/videos/…`) : il est servi par
 * l'API, pas par Next. Seul ce préfixe est réécrit — une adresse comme
 * `/articles/glycemie.jpg` désigne un fichier du site et doit le rester.
 */
export function urlMedia(chemin: string | null | undefined): string {
  if (!chemin) return '';
  if (chemin.startsWith('/uploads/')) return `${API_URL}${chemin}`;
  return chemin;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly statut: number,
    readonly erreurs?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function construireUrl(chemin: string, params?: Record<string, unknown>): string {
  const url = new URL(`${API_URL}/api${chemin}`);
  for (const [cle, valeur] of Object.entries(params ?? {})) {
    if (valeur === undefined || valeur === null || valeur === '') continue;
    url.searchParams.set(cle, String(valeur));
  }
  return url.toString();
}

async function lireErreur(reponse: Response): Promise<ApiError> {
  let message = `Erreur ${reponse.status}`;
  let erreurs: string[] | undefined;
  try {
    const corps = await reponse.json();
    message = corps.message ?? message;
    erreurs = corps.erreurs;
  } catch {
    // Réponse non-JSON (proxy, timeout) : on garde le message générique.
  }
  return new ApiError(message, reponse.status, erreurs);
}

// ─── Site vitrine (Server Components) ──────────────────────────────────────

interface OptionsPubliques {
  params?: Record<string, unknown>;
  /** Durée de cache ISR en secondes ; 0 pour désactiver. */
  revalidate?: number;
}

export async function apiPublic<T>(
  chemin: string,
  options: OptionsPubliques = {},
): Promise<T> {
  const { params, revalidate = 300 } = options;

  const reponse = await fetch(construireUrl(chemin, params), {
    headers: { Accept: 'application/json' },
    next: revalidate > 0 ? { revalidate } : undefined,
    cache: revalidate > 0 ? undefined : 'no-store',
  });

  if (!reponse.ok) throw await lireErreur(reponse);

  /*
   * Les textes saisis au back-office partent vers une page de vitrine, où ils
   * sont composés dans des colonnes étroites. Les espaces qu'exige la
   * typographie française y sont rendues insécables une fois pour toutes :
   * autrement, chaque composant devrait y penser, et le premier qui l'oublie
   * renvoie un guillemet fermant seul à la ligne.
   *
   * Seule la lecture publique est concernée. `apiAdmin` ne passe pas par ici :
   * ce que l'administrateur relit dans ses formulaires reste ce qu'il a tapé.
   */
  return typographieFrProfonde((await reponse.json()) as T);
}

/**
 * Variante tolérante aux pannes : si l'API est injoignable, la page se rend
 * quand même avec une valeur de repli plutôt que d'afficher une erreur 500.
 */
export async function apiPublicOuDefaut<T>(
  chemin: string,
  valeurDefaut: T,
  options: OptionsPubliques = {},
): Promise<T> {
  try {
    return await apiPublic<T>(chemin, options);
  } catch {
    return valeurDefaut;
  }
}

// ─── Back-office (navigateur) ──────────────────────────────────────────────

let jetonAcces: string | null = null;
let rafraichissementEnCours: Promise<string | null> | null = null;

/**
 * Renouvelle le jeton d'accès à partir du cookie HttpOnly.
 * Les appels concurrents partagent la même promesse : sans cela, plusieurs
 * requêtes expirant en même temps déclencheraient autant de rotations, et
 * les jetons émis s'invalideraient mutuellement.
 */
async function rafraichirJeton(): Promise<string | null> {
  if (rafraichissementEnCours) return rafraichissementEnCours;

  rafraichissementEnCours = (async () => {
    try {
      const reponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!reponse.ok) return null;
      const corps = await reponse.json();
      jetonAcces = corps.accessToken;
      return jetonAcces;
    } catch {
      return null;
    } finally {
      rafraichissementEnCours = null;
    }
  })();

  return rafraichissementEnCours;
}

interface OptionsAdmin {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  body?: unknown;
  /** Corps déjà formaté (FormData pour les téléversements). */
  formData?: FormData;
  /** Usage interne : empêche une boucle de rafraîchissement. */
  _reessai?: boolean;
}

export async function apiAdmin<T>(
  chemin: string,
  options: OptionsAdmin = {},
): Promise<T> {
  const { method = 'GET', params, body, formData, _reessai } = options;

  const entetes: Record<string, string> = { Accept: 'application/json' };
  if (jetonAcces) entetes.Authorization = `Bearer ${jetonAcces}`;
  if (body !== undefined) entetes['Content-Type'] = 'application/json';

  const reponse = await fetch(construireUrl(chemin, params), {
    method,
    headers: entetes,
    credentials: 'include',
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  // Jeton expiré (15 min) : on le renouvelle et on rejoue une seule fois.
  if (reponse.status === 401 && !_reessai) {
    const nouveau = await rafraichirJeton();
    if (nouveau) {
      return apiAdmin<T>(chemin, { ...options, _reessai: true });
    }
  }

  if (!reponse.ok) throw await lireErreur(reponse);
  if (reponse.status === 204) return undefined as T;

  const contentType = reponse.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await reponse.text()) as T;
  }
  return reponse.json() as Promise<T>;
}

export interface OptionsTeleversement {
  /** Corps multipart déjà constitué. */
  formData: FormData;
  /** Appelé à chaque avancée, de 0 à 100. */
  onProgression?: (pourcentage: number) => void;
  /** Permet d'interrompre un envoi en cours. */
  signal?: AbortSignal;
}

/**
 * Téléverse un fichier en rendant compte de l'avancement.
 *
 * `fetch` ne sait pas suivre la progression d'un envoi : il faut
 * XMLHttpRequest. Le code vit ici, et non dans le composant, parce que le
 * jeton d'accès et sa rotation y vivent déjà — un composant qui bricolerait
 * son propre en-tête d'autorisation s'en trouverait désynchronisé au premier
 * renouvellement.
 *
 * Sur un 401, le jeton est renouvelé et l'envoi rejoué une fois. C'est long
 * quand le fichier est lourd, mais c'est l'alternative à une erreur affichée
 * après plusieurs minutes d'attente.
 */
export async function televerser<T>(
  chemin: string,
  options: OptionsTeleversement,
): Promise<T> {
  // Session restaurée mais jeton pas encore en mémoire : on l'obtient avant
  // d'engager le transfert plutôt qu'après l'avoir perdu.
  if (!jetonAcces) await rafraichirJeton();

  try {
    return await envoyerFormulaire<T>(chemin, options);
  } catch (erreur) {
    if (erreur instanceof ApiError && erreur.statut === 401) {
      const nouveau = await rafraichirJeton();
      if (nouveau) return envoyerFormulaire<T>(chemin, options);
    }
    throw erreur;
  }
}

function envoyerFormulaire<T>(
  chemin: string,
  { formData, onProgression, signal }: OptionsTeleversement,
): Promise<T> {
  return new Promise<T>((resoudre, rejeter) => {
    if (signal?.aborted) {
      rejeter(new ApiError('Envoi interrompu.', 0));
      return;
    }

    const requete = new XMLHttpRequest();
    requete.open('POST', construireUrl(chemin));
    // Indispensable : le cookie de rafraîchissement est HttpOnly.
    requete.withCredentials = true;
    requete.setRequestHeader('Accept', 'application/json');
    if (jetonAcces) requete.setRequestHeader('Authorization', `Bearer ${jetonAcces}`);
    /*
     * Content-Type est volontairement absent : le navigateur doit le poser
     * lui-même pour y joindre la frontière multipart. L'imposer à la main
     * produit un corps que le serveur ne sait pas découper.
     */

    const interrompre = () => requete.abort();
    signal?.addEventListener('abort', interrompre);
    const detacher = () => signal?.removeEventListener('abort', interrompre);

    if (onProgression) {
      requete.upload.onprogress = (evenement) => {
        if (evenement.lengthComputable) {
          onProgression(Math.round((evenement.loaded / evenement.total) * 100));
        }
      };
    }

    requete.onload = () => {
      detacher();
      if (requete.status >= 200 && requete.status < 300) {
        try {
          resoudre(requete.responseText ? JSON.parse(requete.responseText) : (undefined as T));
        } catch {
          rejeter(new ApiError('Réponse illisible du serveur.', requete.status));
        }
        return;
      }
      rejeter(erreurDeRequete(requete));
    };

    requete.onerror = () => {
      detacher();
      rejeter(new ApiError('Envoi interrompu. Vérifiez la connexion.', 0));
    };

    requete.onabort = () => {
      detacher();
      rejeter(new ApiError('Envoi interrompu.', 0));
    };

    requete.send(formData);
  });
}

function erreurDeRequete(requete: XMLHttpRequest): ApiError {
  // 413 est produit par le serveur sans corps JSON exploitable.
  if (requete.status === 413) {
    return new ApiError('Fichier trop lourd pour le serveur.', 413);
  }
  try {
    const corps = JSON.parse(requete.responseText);
    return new ApiError(
      corps?.message ?? `Erreur ${requete.status}`,
      requete.status,
      corps?.erreurs,
    );
  } catch {
    return new ApiError(`Erreur ${requete.status}`, requete.status);
  }
}

/** Télécharge un fichier généré par l'API (exports, rapports PDF). */
export async function telechargerFichier(
  chemin: string,
  params: Record<string, unknown>,
  nomFichier: string,
): Promise<void> {
  const entetes: Record<string, string> = {};
  if (jetonAcces) entetes.Authorization = `Bearer ${jetonAcces}`;

  let reponse = await fetch(construireUrl(chemin, params), {
    headers: entetes,
    credentials: 'include',
  });

  if (reponse.status === 401) {
    const nouveau = await rafraichirJeton();
    if (nouveau) {
      reponse = await fetch(construireUrl(chemin, params), {
        headers: { Authorization: `Bearer ${nouveau}` },
        credentials: 'include',
      });
    }
  }

  if (!reponse.ok) throw await lireErreur(reponse);

  const blob = await reponse.blob();
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  // Le serveur nomme le fichier d'après son contenu (nom de campagne, filtres
  // appliqués). Le nom passé en argument ne sert que s'il ne l'a pas fait.
  lien.download = nomEnvoyeParServeur(reponse) ?? nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  // Libère la mémoire du blob une fois le téléchargement amorcé.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Lit le nom de fichier de l'en-tête Content-Disposition, s'il est présent. */
function nomEnvoyeParServeur(reponse: Response): string | null {
  const entete = reponse.headers.get('Content-Disposition');
  if (!entete) return null;

  // filename*=UTF-8''… est prioritaire : il porte les caractères accentués.
  const etendu = entete.match(/filename\*=UTF-8''([^;]+)/i);
  if (etendu) return decodeURIComponent(etendu[1].trim());

  const simple = entete.match(/filename="?([^";]+)"?/i);
  return simple ? simple[1].trim() : null;
}

export async function connexion(
  email: string,
  password: string,
  twofaCode?: string,
): Promise<{ accessToken: string; user: Utilisateur }> {
  const reponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, twofaCode }),
  });

  if (!reponse.ok) throw await lireErreur(reponse);

  const corps = await reponse.json();
  jetonAcces = corps.accessToken;
  return corps;
}

export async function deconnexion(): Promise<void> {
  try {
    await apiAdmin('/auth/logout', { method: 'POST' });
  } finally {
    jetonAcces = null;
  }
}

/** Tente de restaurer une session au chargement du back-office. */
export async function restaurerSession(): Promise<Utilisateur | null> {
  const jeton = await rafraichirJeton();
  if (!jeton) return null;
  try {
    return await apiAdmin<Utilisateur>('/auth/me');
  } catch {
    return null;
  }
}
