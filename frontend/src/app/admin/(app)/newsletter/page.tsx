'use client';

import { useCallback, useEffect, useState } from 'react';
import { EditeurTexte } from '@/components/admin/EditeurTexte';
import {
  Alerte,
  Chargement,
  ConfirmationSuppression,
  EnTetePage,
  EtatVide,
  Modale,
  Pagination,
  Panneau,
} from '@/components/admin/Elements';
import { apiAdmin, ApiError, telechargerFichier } from '@/lib/api';
import { dateHeure, nombre } from '@/lib/format';
import type {
  AbonneNewsletter,
  Article,
  EnvoiNewsletter,
  Paginated,
} from '@/lib/types';

const VIDE_ABONNES: Paginated<AbonneNewsletter> = {
  items: [], total: 0, page: 1, limit: 25, pages: 1,
};
const VIDE_ENVOIS: Paginated<EnvoiNewsletter> = {
  items: [], total: 0, page: 1, limit: 10, pages: 1,
};

export default function PageNewsletter() {
  const [abonnes, setAbonnes] = useState<Paginated<AbonneNewsletter>>(VIDE_ABONNES);
  const [envois, setEnvois] = useState<Paginated<EnvoiNewsletter>>(VIDE_ENVOIS);
  const [stats, setStats] = useState({ total: 0, actifs: 0, desinscrits: 0 });
  const [articles, setArticles] = useState<Article[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [modaleEnvoi, setModaleEnvoi] = useState(false);
  const [aSupprimer, setASupprimer] = useState<AbonneNewsletter | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [listeAbonnes, listeEnvois, statistiques] = await Promise.all([
        apiAdmin<Paginated<AbonneNewsletter>>('/newsletter/abonnes', {
          params: { page, limit: 25 },
        }),
        apiAdmin<Paginated<EnvoiNewsletter>>('/newsletter/envois', {
          params: { limit: 10 },
        }),
        apiAdmin<{ total: number; actifs: number; desinscrits: number }>(
          '/newsletter/statistiques',
        ),
      ]);
      setAbonnes(listeAbonnes);
      setEnvois(listeEnvois);
      setStats(statistiques);
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    void apiAdmin<Paginated<Article>>('/articles', {
      params: { statut: 'published', limit: 50 },
    })
      .then((reponse) => setArticles(reponse.items))
      .catch(() => undefined);
  }, []);

  async function supprimerAbonne() {
    if (!aSupprimer) return;
    setAction(true);
    try {
      await apiAdmin(`/newsletter/abonnes/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`${aSupprimer.email} retiré de la liste.`);
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

  return (
    <>
      <EnTetePage
        titre="Newsletter"
        complement={`${nombre(stats.actifs)} abonnés actifs`}
        actions={
          <button
            type="button"
            onClick={() => setModaleEnvoi(true)}
            className="admin-bouton"
          >
            Rédiger un envoi
          </button>
        }
      />

      <div className="space-y-5 p-6">
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

        <div className="grid gap-px bg-admin-trait sm:grid-cols-3">
          {[
            { libelle: 'Abonnés actifs', valeur: stats.actifs },
            { libelle: 'Désinscrits', valeur: stats.desinscrits },
            { libelle: 'Envois réalisés', valeur: envois.total },
          ].map((carte) => (
            <div key={carte.libelle} className="bg-white px-6 py-5">
              <p className="etiquette">{carte.libelle}</p>
              <p className="mt-2 text-[1.75rem] font-bold leading-none">
                {nombre(carte.valeur)}
              </p>
            </div>
          ))}
        </div>

        <Panneau
          titre="Derniers envois"
          action={
            <span className="font-mono text-[0.8125rem] text-admin-gris">
              {nombre(envois.total)} au total
            </span>
          }
        >
          {envois.items.length === 0 ? (
            <p className="text-sm text-admin-gris">Aucun envoi pour le moment.</p>
          ) : (
            <ul className="divide-y divide-admin-trait">
              {envois.items.map((envoi) => (
                <li
                  key={envoi.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{envoi.sujet}</p>
                    <p className="mt-0.5 font-mono text-[0.75rem] text-admin-gris">
                      {envoi.date_envoi ? dateHeure(envoi.date_envoi) : 'Non envoyé'} ·{' '}
                      {nombre(envoi.nb_destinataires)} destinataires
                    </p>
                  </div>
                  <span
                    className={`pastille ${
                      envoi.statut === 'envoye'
                        ? 'pastille-normal'
                        : envoi.statut === 'echec'
                          ? 'pastille-alerte'
                          : 'pastille-neutre'
                    }`}
                  >
                    {envoi.statut === 'envoye'
                      ? 'Envoyé'
                      : envoi.statut === 'echec'
                        ? 'Échec'
                        : 'Planifié'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panneau>

        <div className="admin-panneau">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-trait p-4">
            <h2 className="etiquette">Abonnés</h2>
            <button
              type="button"
              onClick={() =>
                void telechargerFichier(
                  '/exports/abonnes',
                  { format: 'excel' },
                  'abonnes-newsletter.xlsx',
                )
              }
              className="admin-bouton-clair"
            >
              Exporter en Excel
            </button>
          </div>

          {chargement ? (
            <Chargement />
          ) : abonnes.items.length === 0 ? (
            <EtatVide message="Aucun abonné inscrit." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Adresse email</th>
                    <th className="admin-th">Inscription</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {abonnes.items.map((abonne) => (
                    <tr key={abonne.id} className="transition-colors duration-150 hover:bg-admin-fond">
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {abonne.email}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {dateHeure(abonne.created_at)}
                      </td>
                      <td className="admin-td">
                        <span
                          className={`pastille ${
                            abonne.active ? 'pastille-normal' : 'pastille-neutre'
                          }`}
                        >
                          {abonne.active ? 'Actif' : 'Désinscrit'}
                        </span>
                      </td>
                      <td className="admin-td text-right">
                        <button
                          type="button"
                          onClick={() => setASupprimer(abonne)}
                          className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={abonnes.page}
            pages={abonnes.pages}
            total={abonnes.total}
            limite={abonnes.limit}
            onPage={setPage}
          />
        </div>
      </div>

      {modaleEnvoi && (
        <ModaleEnvoi
          articles={articles}
          nbAbonnes={stats.actifs}
          onFermer={() => setModaleEnvoi(false)}
          onEnvoye={(texte) => {
            setMessage(texte);
            setModaleEnvoi(false);
            void charger();
          }}
        />
      )}

      {aSupprimer && (
        <ConfirmationSuppression
          titre="Retirer cet abonné ?"
          message={`${aSupprimer.email} sera définitivement supprimé de la liste de diffusion.`}
          onConfirmer={() => void supprimerAbonne()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}

function ModaleEnvoi({
  articles,
  nbAbonnes,
  onFermer,
  onEnvoye,
}: {
  articles: Article[];
  nbAbonnes: number;
  onFermer: () => void;
  onEnvoye: (message: string) => void;
}) {
  const [sujet, setSujet] = useState('');
  const [articleId, setArticleId] = useState('');
  const [contenu, setContenu] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  function choisirArticle(id: string) {
    setArticleId(id);
    const article = articles.find((candidat) => String(candidat.id) === id);
    if (article && !sujet) setSujet(article.titre);
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur('');
    try {
      const resultat = await apiAdmin<EnvoiNewsletter>('/newsletter/envoyer', {
        method: 'POST',
        body: {
          sujet,
          articleId: articleId ? Number(articleId) : undefined,
          contenu: contenu || undefined,
        },
      });
      onEnvoye(
        `Newsletter « ${resultat.sujet} » traitée : ${nombre(resultat.nb_destinataires)} destinataire(s).`,
      );
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Envoi impossible.',
      );
      setConfirmation(false);
    } finally {
      setEnvoi(false);
    }
  }

  if (confirmation) {
    return (
      <ConfirmationSuppression
        titre="Envoyer la newsletter ?"
        message={`Le message « ${sujet} » va partir vers ${nombre(nbAbonnes)} abonné(s) actifs. Cette action est irréversible.`}
        libelleConfirmation="Envoyer"
        onConfirmer={() => void envoyer()}
        onAnnuler={() => setConfirmation(false)}
        enCours={envoi}
      />
    );
  }

  return (
    <Modale
      titre="Rédiger un envoi"
      sousTitre={`${nombre(nbAbonnes)} abonnés actifs recevront ce message`}
      onFermer={onFermer}
      large
    >
      {erreur && (
        <div className="mb-5">
          <Alerte type="erreur">{erreur}</Alerte>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="sujet" className="etiquette mb-2 block">
            Sujet *
          </label>
          <input
            id="sujet"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            className="admin-champ"
            placeholder="Résultats de la campagne de Sèmè-Kpodji"
          />
        </div>

        <div>
          <label htmlFor="article" className="etiquette mb-2 block">
            Diffuser un article publié
          </label>
          <select
            id="article"
            value={articleId}
            onChange={(e) => choisirArticle(e.target.value)}
            className="admin-champ"
          >
            <option value="">— Rédiger un contenu libre</option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.titre}
              </option>
            ))}
          </select>
        </div>

        {!articleId && (
          <div>
            <span className="etiquette mb-2 block">Message *</span>
            <EditeurTexte
              valeur={contenu}
              onChange={setContenu}
              placeholder="Bonjour, voici les nouvelles de l’association…"
            />
            <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
              Écrivez normalement et utilisez les boutons pour la mise en forme.
              Le message est converti en courriel à l’envoi.
            </p>
          </div>
        )}

        <Alerte type="info">
          Un lien de désinscription est ajouté automatiquement à chaque message. Les
          envois partent par lots de 20 pour rester dans les quotas des offres SMTP
          gratuites.
        </Alerte>
      </div>

      <div className="mt-7 flex justify-end gap-2">
        <button type="button" onClick={onFermer} className="admin-bouton-clair">
          Annuler
        </button>
        <button
          type="button"
          onClick={() => setConfirmation(true)}
          disabled={!sujet || (!articleId && !contenu)}
          className="admin-bouton"
        >
          Envoyer
        </button>
      </div>
    </Modale>
  );
}
