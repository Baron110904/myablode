'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alerte,
  Chargement,
  ConfirmationSuppression,
  EnTetePage,
  EtatVide,
  Pagination,
} from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { FormulaireVideo } from './FormulaireVideo';
import { apiAdmin, ApiError, urlMedia } from '@/lib/api';
import {
  dateHeure,
  duree,
  LIBELLES_CATEGORIE_VIDEO,
  nombre,
  tailleFichier,
} from '@/lib/format';
import type { Paginated, StatutVideo, Video } from '@/lib/types';

const VIDE: Paginated<Video> = { items: [], total: 0, page: 1, limit: 20, pages: 1 };

const STATUTS: Array<{ valeur: StatutVideo | 'tous'; libelle: string }> = [
  { valeur: 'tous', libelle: 'Toutes' },
  { valeur: 'published', libelle: 'Publiées' },
  { valeur: 'draft', libelle: 'Brouillons' },
];

export default function PageVideosAdmin() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [donnees, setDonnees] = useState<Paginated<Video>>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutVideo | 'tous'>('tous');
  const [enEdition, setEnEdition] = useState<Video | null | 'nouvelle'>(null);
  const [aSupprimer, setASupprimer] = useState<Video | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<Video>>('/videos', {
          params: { page, limit: 20, statut: statut === 'tous' ? undefined : statut },
        }),
      );
      setErreur('');
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.');
    } finally {
      setChargement(false);
    }
  }, [page, statut]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function supprimer() {
    if (!aSupprimer) return;
    setAction(true);
    try {
      await apiAdmin(`/videos/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`Vidéo « ${aSupprimer.titre} » supprimée.`);
      setASupprimer(null);
      await charger();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Suppression impossible.');
    } finally {
      setAction(false);
    }
  }

  return (
    <>
      <EnTetePage
        titre="Vidéos"
        complement={`${nombre(donnees.total)} vidéos`}
        actions={
          modifiable ? (
            <button
              type="button"
              onClick={() => setEnEdition('nouvelle')}
              className="admin-bouton"
            >
              + Déposer une vidéo
            </button>
          ) : null
        }
      />

      <div className="space-y-4 p-6">
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}
        {message && (
          <Alerte type="succes" onFermer={() => setMessage('')}>
            {message}
          </Alerte>
        )}

        <Alerte type="info">
          Les vidéos publiées apparaissent dans la section «&#8239;Nos actions en
          vidéo&#8239;» de la page Actualités. Formats acceptés&#8239;: MP4 (H.264) et
          WebM, 200&nbsp;Mo maximum.
        </Alerte>

        <div className="admin-panneau">
          <div className="flex flex-wrap gap-1.5 border-b border-admin-trait p-4">
            {STATUTS.map((filtre) => (
              <button
                key={filtre.valeur}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatut(filtre.valeur);
                }}
                aria-pressed={statut === filtre.valeur}
                className={`puce-filtre ${statut === filtre.valeur ? 'puce-filtre-active' : ''}`}
              >
                {filtre.libelle}
              </button>
            ))}
          </div>

          {chargement ? (
            <Chargement />
          ) : donnees.items.length === 0 ? (
            <EtatVide message="Aucune vidéo pour ce filtre." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Titre</th>
                    <th className="admin-th">Rubrique</th>
                    <th className="admin-th">Durée</th>
                    <th className="admin-th">Poids</th>
                    <th className="admin-th">Publication</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((video) => (
                    <tr
                      key={video.id}
                      className="transition-colors duration-150 hover:bg-admin-fond"
                    >
                      <td className="admin-td max-w-md">
                        <span className="flex items-center gap-2">
                          <span className="block truncate font-bold">{video.titre}</span>
                          {video.a_la_une && (
                            <span className="pastille pastille-normal shrink-0">
                              À la une
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.75rem] text-admin-gris">
                          {video.fichier_nom}
                        </span>
                      </td>
                      <td className="admin-td">
                        {LIBELLES_CATEGORIE_VIDEO[video.categorie]}
                      </td>
                      <td className="admin-td tabular-nums text-[0.8125rem]">
                        {duree(video.duree_secondes)}
                      </td>
                      <td className="admin-td tabular-nums text-[0.8125rem]">
                        {tailleFichier(video.taille)}
                      </td>
                      <td className="admin-td text-[0.8125rem]">
                        {video.date_publication ? dateHeure(video.date_publication) : '-'}
                      </td>
                      <td className="admin-td">
                        <span
                          className={`pastille ${
                            video.statut === 'published'
                              ? 'pastille-normal'
                              : 'pastille-neutre'
                          }`}
                        >
                          {video.statut === 'published' ? 'Publiée' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="admin-td text-right">
                        <span className="flex justify-end gap-3">
                          <a
                            href={urlMedia(video.fichier_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                          >
                            Lire
                          </a>
                          {modifiable && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEnEdition(video)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => setASupprimer(video)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={donnees.page}
            pages={donnees.pages}
            total={donnees.total}
            limite={donnees.limit}
            onPage={setPage}
          />
        </div>
      </div>

      {enEdition && (
        <FormulaireVideo
          video={enEdition === 'nouvelle' ? null : enEdition}
          onFermer={() => setEnEdition(null)}
          onEnregistre={(texte) => {
            setMessage(texte);
            setEnEdition(null);
            void charger();
          }}
        />
      )}

      {aSupprimer && (
        <ConfirmationSuppression
          titre="Supprimer cette vidéo ?"
          message={`« ${aSupprimer.titre} » sera retirée du site et son fichier effacé du serveur. Cette action est irréversible.`}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}
