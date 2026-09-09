import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface KoboAsset {
  uid: string;
  name: string;
  deployment__submission_count?: number;
  asset_type?: string;
}

export interface KoboSubmission {
  _id: number | string;
  _uuid?: string;
  _submission_time?: string;
  _geolocation?: [number | null, number | null];
  [champ: string]: unknown;
}

export interface ResultatTestConnexion {
  ok: boolean;
  message: string;
  formulaire?: { uid: string; nom: string; soumissions: number };
  formulairesDisponibles?: Array<{ uid: string; nom: string; soumissions: number }>;
  champs?: string[];
  /** Correspondance devinée depuis les noms de champs du formulaire. */
  mappingSuggere?: Record<string, string>;
}

/**
 * Client HTTP de l'API KoboToolbox v2.
 *
 * Utilise `fetch` natif (Node 18+) : pas de dépendance HTTP supplémentaire.
 * Toutes les erreurs réseau sont converties en messages lisibles par
 * l'administrateur, qui n'a pas accès aux logs serveur.
 */
@Injectable()
export class KoboClientService {
  private readonly logger = new Logger(KoboClientService.name);
  private static readonly TIMEOUT_MS = 30_000;

  /**
   * Vérifie les paramètres de connexion (bouton « Tester » de la section
   * 3.2.3.A). Renvoie aussi la liste des formulaires disponibles pour aider
   * l'administrateur à retrouver le bon UID.
   */
  async tester(
    apiUrl: string,
    token: string,
    formId?: string,
  ): Promise<ResultatTestConnexion> {
    if (!token?.trim()) {
      return { ok: false, message: 'Aucun jeton API renseigné.' };
    }

    let assets: KoboAsset[];
    try {
      const reponse = await this.requete<{ results: KoboAsset[] }>(
        `${normaliserUrl(apiUrl)}/api/v2/assets/?limit=200`,
        token,
      );
      assets = (reponse.results ?? []).filter(
        (asset) => asset.asset_type === 'survey' || !asset.asset_type,
      );
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }

    const formulaires = assets.map((asset) => ({
      uid: asset.uid,
      nom: asset.name,
      soumissions: asset.deployment__submission_count ?? 0,
    }));

    if (!formId?.trim()) {
      return {
        ok: true,
        message:
          `Connexion réussie : ${formulaires.length} formulaire(s) accessible(s). ` +
          `Sélectionnez celui à synchroniser.`,
        formulairesDisponibles: formulaires,
      };
    }

    const formulaire = formulaires.find((f) => f.uid === formId.trim());
    if (!formulaire) {
      return {
        ok: false,
        message: `Le formulaire « ${formId} » n’est pas accessible avec ce jeton.`,
        formulairesDisponibles: formulaires,
      };
    }

    // Un échantillon d'une soumission révèle les noms de champs réels,
    // indispensables pour construire la correspondance.
    let champs: string[] = [];
    try {
      const echantillon = await this.recupererSoumissions(apiUrl, token, formId, 1);
      if (echantillon.length > 0) {
        champs = Object.keys(echantillon[0]).filter((cle) => !cle.startsWith('_'));
      }
    } catch (error) {
      this.logger.warn(`Échantillon indisponible : ${(error as Error).message}`);
    }

    return {
      ok: true,
      message:
        `Connexion réussie au formulaire « ${formulaire.nom} » ` +
        `(${formulaire.soumissions} soumission(s)).`,
      formulaire,
      formulairesDisponibles: formulaires,
      champs,
    };
  }

  /**
   * Récupère les soumissions. Kobo pagine par `limit`/`start` : on boucle
   * jusqu'à épuisement pour tenir la cible de 10 000 enregistrements en
   * moins de 5 minutes (section 6.3).
   */
  async recupererSoumissions(
    apiUrl: string,
    token: string,
    formId: string,
    limiteTotale = 50_000,
    depuis?: Date,
  ): Promise<KoboSubmission[]> {
    const base = normaliserUrl(apiUrl);
    const taillePage = 1000;
    const soumissions: KoboSubmission[] = [];
    let debut = 0;

    const query = depuis
      ? `&query=${encodeURIComponent(
          JSON.stringify({ _submission_time: { $gte: depuis.toISOString() } }),
        )}`
      : '';

    while (soumissions.length < limiteTotale) {
      const url =
        `${base}/api/v2/assets/${formId}/data/` +
        `?format=json&limit=${taillePage}&start=${debut}${query}`;

      const reponse = await this.requete<{ results: KoboSubmission[]; count?: number }>(
        url,
        token,
      );
      const lot = reponse.results ?? [];
      soumissions.push(...lot);

      if (lot.length < taillePage) break;
      debut += taillePage;
    }

    return soumissions.slice(0, limiteTotale);
  }

  private async requete<T>(url: string, token: string): Promise<T> {
    const controleur = new AbortController();
    const minuteur = setTimeout(
      () => controleur.abort(),
      KoboClientService.TIMEOUT_MS,
    );

    try {
      const reponse = await fetch(url, {
        headers: {
          Authorization: `Token ${token.trim()}`,
          Accept: 'application/json',
        },
        signal: controleur.signal,
      });

      if (reponse.status === 401 || reponse.status === 403) {
        throw new Error(
          'Jeton API refusé par Kobo. Vérifiez le jeton dans Paramètres → Kobo.',
        );
      }
      if (reponse.status === 404) {
        throw new Error(
          'Ressource introuvable sur Kobo. Vérifiez l’URL de l’API et l’identifiant du formulaire.',
        );
      }
      if (!reponse.ok) {
        throw new Error(
          `Kobo a répondu ${reponse.status} ${reponse.statusText}.`,
        );
      }

      return (await reponse.json()) as T;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new ServiceUnavailableException(
          'Kobo n’a pas répondu dans le délai imparti (30 s).',
        );
      }
      if ((error as Error).message?.includes('fetch failed')) {
        throw new ServiceUnavailableException(
          `Impossible de joindre ${url.split('/api')[0]}. Vérifiez l’URL et la connexion réseau du serveur.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(minuteur);
    }
  }
}

/** Retire le slash final : évite les doubles slashes dans les URL construites. */
function normaliserUrl(url: string): string {
  return (url || 'https://kf.kobotoolbox.org').trim().replace(/\/+$/, '');
}
