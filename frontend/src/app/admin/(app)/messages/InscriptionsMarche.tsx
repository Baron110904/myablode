'use client';

import { useCallback, useEffect, useState } from 'react';
import { Chargement, EtatVide, Pagination } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, nombre } from '@/lib/format';
import type {
  InscriptionMarche,
  Paginated,
  StatsInscriptions,
} from '@/lib/types';

const VIDE: Paginated<InscriptionMarche> = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  pages: 1,
};

/**
 * Inscriptions reçues pour la marche « Sucre à terre ».
 *
 * La répartition en tête n'est pas décorative : elle sert à préparer les
 * groupes de départ et à commander les dossards. C'est pour cela qu'elle
 * précède la liste plutôt que de la conclure.
 */
export function InscriptionsMarche({
  onErreur,
}: {
  onErreur: (message: string) => void;
}) {
  const [donnees, setDonnees] = useState<Paginated<InscriptionMarche>>(VIDE);
  const [stats, setStats] = useState<StatsInscriptions | null>(null);
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [saisie, setSaisie] = useState('');
  const [masquerTraites, setMasquerTraites] = useState(false);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [liste, repartition] = await Promise.all([
        apiAdmin<Paginated<InscriptionMarche>>('/marche/inscriptions', {
          params: {
            page,
            limit: 20,
            recherche: recherche || undefined,
            traite: masquerTraites ? false : undefined,
          },
        }),
        apiAdmin<StatsInscriptions>('/marche/inscriptions/statistiques'),
      ]);
      setDonnees(liste);
      setStats(repartition);
    } catch (attrapee) {
      onErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [page, recherche, masquerTraites, onErreur]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function basculer(id: number, traite: boolean) {
    try {
      await apiAdmin(`/marche/inscriptions/${id}`, {
        method: 'PATCH',
        body: { traite },
      });
      await charger();
    } catch (attrapee) {
      onErreur(attrapee instanceof ApiError ? attrapee.message : 'Action impossible.');
    }
  }

  return (
    <div className="admin-panneau">
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-px border-b border-admin-trait bg-admin-trait sm:grid-cols-5">
          {[
            { libelle: 'Inscrits', valeur: nombre(stats.total) },
            { libelle: 'Femmes', valeur: nombre(stats.femmes) },
            { libelle: 'Hommes', valeur: nombre(stats.hommes) },
            { libelle: 'Déjà venus', valeur: nombre(stats.ancienParticipants) },
            {
              libelle: 'Âge moyen',
              valeur: stats.ageMoyen !== null ? `${stats.ageMoyen} ans` : '—',
            },
          ].map((carte) => (
            <div key={carte.libelle} className="bg-white px-5 py-4">
              <p className="etiquette">{carte.libelle}</p>
              <p className="mt-2 text-xl font-bold leading-none">{carte.valeur}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b border-admin-trait p-4">
        <form
          onSubmit={(evenement) => {
            evenement.preventDefault();
            setPage(1);
            setRecherche(saisie);
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Nom, prénom ou ville"
            aria-label="Rechercher un inscrit"
            className="admin-champ max-w-xs"
          />
          <button type="submit" className="admin-bouton-clair">
            Rechercher
          </button>
        </form>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[0.8125rem] text-admin-gris">
          <input
            type="checkbox"
            checked={masquerTraites}
            onChange={(e) => {
              setPage(1);
              setMasquerTraites(e.target.checked);
            }}
            className="h-4 w-4 rounded border-admin-trait accent-admin-vert"
          />
          Masquer les inscriptions traitées
        </label>
      </div>

      {chargement ? (
        <Chargement />
      ) : donnees.items.length === 0 ? (
        <EtatVide
          message={
            recherche
              ? 'Aucune inscription ne correspond à cette recherche.'
              : 'Aucune inscription reçue. Publiez le formulaire sur l’article de la marche pour ouvrir les inscriptions.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead>
              <tr className="border-b border-admin-trait">
                <th className="admin-th">Participant</th>
                <th className="admin-th">Âge</th>
                <th className="admin-th">Sexe</th>
                <th className="admin-th">Fonction</th>
                <th className="admin-th">Provenance</th>
                <th className="admin-th">Édition passée</th>
                <th className="admin-th">Contact</th>
                <th className="admin-th">Reçue le</th>
                <th className="admin-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-trait">
              {donnees.items.map((inscription) => (
                <tr
                  key={inscription.id}
                  className={`transition-colors duration-150 hover:bg-admin-fond ${
                    inscription.traite ? 'opacity-60' : ''
                  }`}
                >
                  <td className="admin-td">
                    <span className="font-bold">
                      {inscription.prenom} {inscription.nom}
                    </span>
                    {inscription.motivation && (
                      <p
                        title={inscription.motivation}
                        className="mt-1 max-w-[22rem] truncate text-[0.75rem] text-admin-gris"
                      >
                        « {inscription.motivation} »
                      </p>
                    )}
                  </td>
                  <td className="admin-td tabular-nums">{inscription.age}</td>
                  <td className="admin-td">
                    {inscription.sexe === 'F' ? 'Féminin' : 'Masculin'}
                  </td>
                  <td className="admin-td">{inscription.fonction}</td>
                  <td className="admin-td">
                    <span className="text-sm">{inscription.ville}</span>
                    <span className="block text-[0.75rem] text-admin-gris">
                      {inscription.quartier}
                    </span>
                  </td>
                  <td className="admin-td">
                    <span
                      className={`pastille ${
                        inscription.deja_participe
                          ? 'pastille-normal'
                          : 'pastille-neutre'
                      }`}
                    >
                      {inscription.deja_participe ? 'Déjà venu' : 'Première fois'}
                    </span>
                  </td>
                  <td className="admin-td">
                    {inscription.telephone || inscription.email ? (
                      <>
                        {inscription.telephone && (
                          <a
                            href={`tel:${inscription.telephone.replace(/\s/g, '')}`}
                            className="block font-mono text-[0.8125rem] hover:text-admin-vert"
                          >
                            {inscription.telephone}
                          </a>
                        )}
                        {inscription.email && (
                          <a
                            href={`mailto:${inscription.email}`}
                            title={inscription.email}
                            className="block max-w-[14rem] truncate text-[0.75rem] text-admin-gris hover:text-admin-vert"
                          >
                            {inscription.email}
                          </a>
                        )}
                      </>
                    ) : (
                      /* Inscriptions reçues avant l'ajout de ces deux champs. */
                      <span className="text-[0.8125rem] text-admin-gris">—</span>
                    )}
                  </td>
                  <td className="admin-td font-mono text-[0.8125rem]">
                    {dateHeure(inscription.created_at)}
                  </td>
                  <td className="admin-td text-right">
                    <button
                      type="button"
                      onClick={() => void basculer(inscription.id, !inscription.traite)}
                      className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                    >
                      {inscription.traite ? 'Rouvrir' : 'Marquer traité'}
                    </button>
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
  );
}
