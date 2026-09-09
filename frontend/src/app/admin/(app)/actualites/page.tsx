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
import { EditeurArticle } from './EditeurArticle';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, LIBELLES_CATEGORIE, nombre } from '@/lib/format';
import type { Article, Paginated, StatutArticle } from '@/lib/types';

const VIDE: Paginated<Article> = { items: [], total: 0, page: 1, limit: 20, pages: 1 };

const STATUTS: Array<{ valeur: StatutArticle | 'tous'; libelle: string }> = [
  { valeur: 'tous', libelle: 'Tous' },
  { valeur: 'published', libelle: 'Publiés' },
  { valeur: 'draft', libelle: 'Brouillons' },
  { valeur: 'archived', libelle: 'Archivés' },
];

const LIBELLES_STATUT: Record<StatutArticle, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

export default function PageActualitesAdmin() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [donnees, setDonnees] = useState<Paginated<Article>>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutArticle | 'tous'>('tous');
  const [enEdition, setEnEdition] = useState<Article | null | 'nouveau'>(null);
  const [aSupprimer, setASupprimer] = useState<Article | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<Article>>('/articles', {
          params: {
            page,
            limit: 20,
            statut: statut === 'tous' ? undefined : statut,
          },
        }),
      );
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
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
      await apiAdmin(`/articles/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`Article « ${aSupprimer.titre} » supprimé.`);
      setASupprimer(null);
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Suppression impossible.',
      );
    } finally {
      setAction(false);
    }
  }

  async function ouvrirEdition(article: Article) {
    try {
      // La liste ne renvoie pas le contenu complet : on recharge la fiche.
      setEnEdition(await apiAdmin<Article>(`/articles/${article.id}`));
    } catch {
      setErreur('Chargement de l’article impossible.');
    }
  }

  if (enEdition) {
    return (
      <EditeurArticle
        article={enEdition === 'nouveau' ? null : enEdition}
        onFermer={() => setEnEdition(null)}
        onEnregistre={(texte) => {
          setMessage(texte);
          setEnEdition(null);
          void charger();
        }}
      />
    );
  }

  return (
    <>
      <EnTetePage
        titre="Actualités"
        complement={`${nombre(donnees.total)} articles`}
        actions={
          modifiable ? (
            <button
              type="button"
              onClick={() => setEnEdition('nouveau')}
              className="admin-bouton"
            >
              + Nouvel article
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
            <EtatVide message="Aucun article pour ce filtre." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Titre</th>
                    <th className="admin-th">Catégorie</th>
                    <th className="admin-th">Auteur</th>
                    <th className="admin-th">Langue</th>
                    <th className="admin-th">Publication</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((article) => {
                    const programme =
                      article.statut === 'published' &&
                      article.date_publication &&
                      new Date(article.date_publication) > new Date();

                    return (
                      <tr key={article.id} className="transition-colors duration-150 hover:bg-admin-fond">
                        <td className="admin-td max-w-md">
                          <span className="block truncate font-bold">{article.titre}</span>
                          <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-admin-gris">
                            /{article.slug}
                          </span>
                        </td>
                        <td className="admin-td">
                          {LIBELLES_CATEGORIE[article.categorie]}
                        </td>
                        <td className="admin-td">{article.auteur ?? '—'}</td>
                        <td className="admin-td font-mono text-[0.8125rem] uppercase">
                          {article.langue}
                        </td>
                        <td className="admin-td font-mono text-[0.8125rem]">
                          {article.date_publication ? dateHeure(article.date_publication) : '—'}
                        </td>
                        <td className="admin-td">
                          <span
                            className={`pastille ${
                              programme
                                ? 'pastille-attention'
                                : article.statut === 'published'
                                  ? 'pastille-normal'
                                  : 'pastille-neutre'
                            }`}
                          >
                            {programme ? 'Programmé' : LIBELLES_STATUT[article.statut]}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <span className="flex justify-end gap-3">
                            <a
                              href={`/actualites/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                            >
                              Voir
                            </a>
                            {modifiable && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void ouvrirEdition(article)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setASupprimer(article)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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

      {aSupprimer && (
        <ConfirmationSuppression
          titre="Supprimer cet article ?"
          message={`« ${aSupprimer.titre} » sera définitivement supprimé, ainsi que son adresse publique. Cette action est irréversible.`}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}
