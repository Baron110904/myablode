'use client';

import { useEffect, useRef, useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { ChampImage } from '@/components/admin/ChampImage';
import { apiAdmin, ApiError, televerser } from '@/lib/api';
import { LIBELLES_CATEGORIE_VIDEO, duree, tailleFichier } from '@/lib/format';
import type { CategorieVideo, StatutVideo, Video } from '@/lib/types';

/** Doit rester aligné sur FORMATS_VIDEO côté API. */
const TYPES_ACCEPTES = ['video/mp4', 'video/webm'];
const TAILLE_MAX_MO = 200;

const CATEGORIES = Object.entries(LIBELLES_CATEGORIE_VIDEO) as Array<
  [CategorieVideo, string]
>;

interface Valeurs {
  titre: string;
  description: string;
  categorie: CategorieVideo;
  miniature_url: string;
  statut: StatutVideo;
  a_la_une: boolean;
}

function valeursInitiales(video: Video | null): Valeurs {
  return {
    titre: video?.titre ?? '',
    description: video?.description ?? '',
    categorie: video?.categorie ?? 'depistage',
    miniature_url: video?.miniature_url ?? '',
    statut: video?.statut ?? 'draft',
    a_la_une: video?.a_la_une ?? false,
  };
}

/**
 * Dépôt d'une vidéo, ou modification de sa fiche.
 *
 * Le fichier ne se remplace pas : pour changer la vidéo, on en dépose une
 * autre et on supprime l'ancienne. Un remplacement en place laisserait
 * l'ancien fichier sur le disque le temps d'une erreur de transfert, et la
 * fiche pointerait un moment vers un fichier à moitié écrit.
 */
export function FormulaireVideo({
  video,
  onFermer,
  onEnregistre,
}: {
  video: Video | null;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const [valeurs, setValeurs] = useState<Valeurs>(() => valeursInitiales(video));
  const [fichier, setFichier] = useState<File | null>(null);
  const [dureeMesuree, setDureeMesuree] = useState<number | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const interrupteurRef = useRef<AbortController | null>(null);

  // Un envoi abandonné ne doit pas continuer à consommer la liaison.
  useEffect(() => () => interrupteurRef.current?.abort(), []);

  const maj = <C extends keyof Valeurs>(cle: C, valeur: Valeurs[C]) =>
    setValeurs((precedent) => ({ ...precedent, [cle]: valeur }));

  /**
   * Mesure la durée avant l'envoi.
   *
   * Le serveur ne sait pas la lire sans ffprobe ; le navigateur, lui, la
   * connaît dès que les métadonnées du fichier local sont chargées.
   */
  function surFichier(choisi: File | null) {
    setErreur('');
    setDureeMesuree(null);
    setFichier(choisi);
    if (!choisi) return;

    if (!TYPES_ACCEPTES.includes(choisi.type)) {
      setErreur('Format refusé. Déposez un fichier MP4 (H.264) ou WebM.');
      setFichier(null);
      return;
    }
    if (choisi.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreur(
        `Fichier trop lourd (${tailleFichier(choisi.size)}). ` +
          `La limite est de ${TAILLE_MAX_MO} Mo.`,
      );
      setFichier(null);
      return;
    }

    const adresse = URL.createObjectURL(choisi);
    const lecteur = document.createElement('video');
    lecteur.preload = 'metadata';
    lecteur.onloadedmetadata = () => {
      if (Number.isFinite(lecteur.duration)) {
        setDureeMesuree(Math.round(lecteur.duration));
      }
      URL.revokeObjectURL(adresse);
    };
    // Fichier illisible par le navigateur : la durée reste inconnue, sans
    // bloquer l'envoi pour autant.
    lecteur.onerror = () => URL.revokeObjectURL(adresse);
    lecteur.src = adresse;

    if (!valeurs.titre.trim()) {
      // Le nom du fichier fait un premier jet de titre acceptable.
      maj('titre', choisi.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    }
  }

  async function enregistrerFiche(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur('');

    if (!valeurs.titre.trim()) {
      setErreur('Le titre est obligatoire.');
      return;
    }

    setEnvoi(true);
    try {
      await apiAdmin(`/videos/${video!.id}`, {
        method: 'PATCH',
        body: {
          titre: valeurs.titre.trim(),
          /*
           * `null` et non `undefined` pour les champs facultatifs : une clé
           * absente du JSON laisse la valeur inchangée en base. Vider le
           * champ puis enregistrer doit l'effacer, pas le conserver.
           */
          description: valeurs.description.trim() || null,
          categorie: valeurs.categorie,
          miniature_url: valeurs.miniature_url.trim() || null,
          statut: valeurs.statut,
          a_la_une: valeurs.a_la_une,
        },
      });
      onEnregistre(`Vidéo « ${valeurs.titre.trim()} » mise à jour.`);
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  async function deposer(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur('');

    if (!fichier) {
      setErreur('Choisissez une vidéo à déposer.');
      return;
    }
    if (!valeurs.titre.trim()) {
      setErreur('Le titre est obligatoire.');
      return;
    }

    const corps = new FormData();
    corps.append('file', fichier);
    corps.append('titre', valeurs.titre.trim());
    corps.append('categorie', valeurs.categorie);
    corps.append('statut', valeurs.statut);
    corps.append('a_la_une', String(valeurs.a_la_une));
    if (valeurs.description.trim()) corps.append('description', valeurs.description.trim());
    if (valeurs.miniature_url.trim()) {
      corps.append('miniature_url', valeurs.miniature_url.trim());
    }
    if (dureeMesuree !== null) corps.append('duree_secondes', String(dureeMesuree));

    const interrupteur = new AbortController();
    interrupteurRef.current = interrupteur;
    setEnvoi(true);
    setProgression(0);

    try {
      await televerser<Video>('/videos', {
        formData: corps,
        onProgression: setProgression,
        signal: interrupteur.signal,
      });
      onEnregistre(`Vidéo « ${valeurs.titre.trim()} » déposée.`);
    } catch (attrapee) {
      // Une interruption volontaire n'est pas une erreur à afficher.
      if (!interrupteur.signal.aborted) {
        setErreur(attrapee instanceof ApiError ? attrapee.message : 'Envoi impossible.');
      }
    } finally {
      interrupteurRef.current = null;
      setEnvoi(false);
      setProgression(null);
    }
  }

  const modeDepot = video === null;
  const interrompre = () => interrupteurRef.current?.abort();

  return (
    <Modale
      titre={modeDepot ? 'Déposer une vidéo' : 'Modifier la fiche'}
      sousTitre={
        modeDepot
          ? `MP4 (H.264) ou WebM · ${TAILLE_MAX_MO} Mo maximum`
          : video.fichier_nom
      }
      onFermer={envoi ? interrompre : onFermer}
      large
    >
      <form onSubmit={modeDepot ? deposer : enregistrerFiche} className="space-y-5">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        {modeDepot && (
          <div>
            <label htmlFor="fichier" className="etiquette-douce mb-2 block">
              Fichier vidéo
            </label>
            <input
              id="fichier"
              type="file"
              accept={TYPES_ACCEPTES.join(',')}
              onChange={(e) => surFichier(e.target.files?.[0] ?? null)}
              disabled={envoi}
              className="w-full rounded-carte border border-dashed border-admin-trait bg-admin-fond px-4 py-5 text-sm transition-colors hover:border-admin-vert file:mr-4 file:rounded-full file:border-0 file:bg-admin-nuit file:px-4 file:py-2 file:text-[0.8125rem] file:font-semibold file:text-white"
            />
            {fichier && (
              <p className="mt-2 text-[0.8125rem] text-admin-gris">
                {tailleFichier(fichier.size)}
                {dureeMesuree !== null && ` · ${duree(dureeMesuree)}`}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="titre" className="etiquette-douce mb-2 block">
            Titre
          </label>
          <input
            id="titre"
            type="text"
            value={valeurs.titre}
            onChange={(e) => maj('titre', e.target.value)}
            maxLength={200}
            disabled={envoi}
            className="admin-champ"
            placeholder="Trois jours de dépistage à Sèmè-Kpodji"
          />
        </div>

        <div>
          <label htmlFor="description" className="etiquette-douce mb-2 block">
            Description
          </label>
          <textarea
            id="description"
            value={valeurs.description}
            onChange={(e) => maj('description', e.target.value)}
            maxLength={2000}
            rows={3}
            disabled={envoi}
            className="admin-champ-multiligne"
            placeholder="Ce que montre la vidéo, en deux phrases."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="categorie" className="etiquette-douce mb-2 block">
              Rubrique
            </label>
            <select
              id="categorie"
              value={valeurs.categorie}
              onChange={(e) => maj('categorie', e.target.value as CategorieVideo)}
              disabled={envoi}
              className="admin-champ"
            >
              {CATEGORIES.map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="statut" className="etiquette-douce mb-2 block">
              Statut
            </label>
            <select
              id="statut"
              value={valeurs.statut}
              onChange={(e) => maj('statut', e.target.value as StatutVideo)}
              disabled={envoi}
              className="admin-champ"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publiée</option>
            </select>
          </div>
        </div>

        <ChampImage
          valeur={valeurs.miniature_url}
          onChange={(url) => maj('miniature_url', url)}
          libelle="Image d’attente (facultatif)"
          aide="Sans image, le lecteur affiche la première image de la vidéo."
          desactive={envoi}
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-carte border border-admin-trait p-4 transition-colors hover:bg-admin-fond">
          <input
            type="checkbox"
            checked={valeurs.a_la_une}
            onChange={(e) => maj('a_la_une', e.target.checked)}
            disabled={envoi}
            className="mt-0.5 h-4 w-4 accent-admin-vert"
          />
          <span className="text-sm">
            <span className="font-semibold">Mettre à la une</span>
            <span className="mt-1 block text-[0.8125rem] leading-relaxed text-admin-gris">
              Occupe le grand lecteur de la page Actualités. Une seule vidéo à la
              fois: celle qui s’y trouvait repasse dans la liste.
            </span>
          </span>
        </label>

        {progression !== null && (
          <div>
            <div className="flex items-center justify-between text-[0.8125rem] text-admin-gris">
              <span>Envoi en cours…</span>
              <span>{progression} %</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progression}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression de l’envoi"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-admin-trait"
            >
              <div
                className="h-full rounded-full bg-admin-vert transition-[width] duration-200"
                style={{ width: `${progression}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-admin-trait pt-5">
          <button
            type="button"
            onClick={envoi ? interrompre : onFermer}
            className="admin-bouton-clair"
          >
            {envoi ? 'Interrompre' : 'Annuler'}
          </button>
          <button type="submit" disabled={envoi} className="admin-bouton">
            {envoi ? 'Envoi…' : modeDepot ? 'Déposer la vidéo' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modale>
  );
}
