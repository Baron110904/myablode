'use client';

import { useCallback, useEffect, useState } from 'react';
import { EquipeCampagne } from './EquipeCampagne';
import {
  Alerte,
  Chargement,
  ConfirmationSuppression,
  EnTetePage,
  EtatVide,
  Modale,
  Pagination,
} from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { apiAdmin, ApiError, telechargerFichier } from '@/lib/api';
import { date, LIBELLES_STATUT_CAMPAGNE, nombre, pourcentage } from '@/lib/format';
import type {
  Agent,
  Campagne,
  Commune,
  Paginated,
  StatutCampagne,
} from '@/lib/types';

const VIDE: Paginated<Campagne> = { items: [], total: 0, page: 1, limit: 20, pages: 1 };

const STATUTS: Array<{ valeur: StatutCampagne | 'tous'; libelle: string }> = [
  { valeur: 'tous', libelle: 'Toutes' },
  { valeur: 'planifiee', libelle: 'Planifiées' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'cloturee', libelle: 'Clôturées' },
];

interface StatsCampagne {
  campagne: Campagne;
  depistages: number;
  cas: number;
  taux: number;
  orientes: number;
  parResultat: Array<{ resultat: string; total: number }>;
  parSexe: Array<{ sexe: string; total: number }>;
}

export default function PageCampagnes() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [donnees, setDonnees] = useState<Paginated<Campagne>>(VIDE);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutCampagne | 'tous'>('tous');

  const [enEdition, setEnEdition] = useState<Campagne | null | 'nouvelle'>(null);
  const [detail, setDetail] = useState<StatsCampagne | null>(null);
  const [aArchiver, setAArchiver] = useState<Campagne | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<Campagne>>('/campagnes', {
          params: {
            page,
            limit: 20,
            statut: statut === 'tous' ? undefined : statut,
            inclureArchivees: true,
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

  useEffect(() => {
    void apiAdmin<Commune[]>('/communes')
      .then(setCommunes)
      .catch(() => undefined);
  }, []);

  async function ouvrirDetail(campagne: Campagne) {
    try {
      setDetail(await apiAdmin<StatsCampagne>(`/campagnes/${campagne.id}/statistiques`));
    } catch {
      setErreur('Statistiques indisponibles pour cette campagne.');
    }
  }

  async function archiver() {
    if (!aArchiver) return;
    setAction(true);
    try {
      await apiAdmin(`/campagnes/${aArchiver.id}/archiver`, { method: 'POST' });
      setMessage(`Campagne « ${aArchiver.nom} » archivée.`);
      setAArchiver(null);
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Archivage impossible.',
      );
    } finally {
      setAction(false);
    }
  }

  return (
    <>
      <EnTetePage
        titre="Campagnes"
        complement={`${nombre(donnees.total)} campagnes`}
        actions={
          modifiable ? (
            <button
              type="button"
              onClick={() => setEnEdition('nouvelle')}
              className="admin-bouton"
            >
              + Nouvelle campagne
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
            <EtatVide message="Aucune campagne enregistrée pour ce filtre." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Campagne</th>
                    <th className="admin-th">Commune</th>
                    <th className="admin-th">Début</th>
                    <th className="admin-th">Fin</th>
                    <th className="admin-th">Responsable</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((campagne) => (
                    <tr key={campagne.id} className="transition-colors duration-150 hover:bg-admin-fond">
                      <td className="admin-td">
                        <button
                          type="button"
                          onClick={() => void ouvrirDetail(campagne)}
                          className="text-left font-bold hover:text-admin-vert"
                        >
                          {campagne.nom}
                        </button>
                        {campagne.archivee && (
                          <span className="ml-2 font-mono text-[0.6875rem] uppercase text-admin-gris">
                            archivée
                          </span>
                        )}
                      </td>
                      <td className="admin-td">{campagne.commune?.nom ?? '—'}</td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {date(campagne.date_debut)}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {campagne.date_fin ? date(campagne.date_fin) : '—'}
                      </td>
                      <td className="admin-td">{campagne.responsable ?? '—'}</td>
                      <td className="admin-td">
                        <span
                          className={`pastille ${
                            campagne.statut === 'en_cours'
                              ? 'pastille-normal'
                              : campagne.statut === 'planifiee'
                                ? 'pastille-attention'
                                : 'pastille-neutre'
                          }`}
                        >
                          {LIBELLES_STATUT_CAMPAGNE[campagne.statut]}
                        </span>
                      </td>
                      <td className="admin-td text-right">
                        <span className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void telechargerFichier(
                                `/campagnes/${campagne.id}/rapport.pdf`,
                                {},
                                nomRapport(campagne.nom),
                              )
                            }
                            className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                          >
                            PDF
                          </button>
                          {modifiable && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEnEdition(campagne)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                              >
                                Modifier
                              </button>
                              {!campagne.archivee && (
                                <button
                                  type="button"
                                  onClick={() => setAArchiver(campagne)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                                >
                                  Archiver
                                </button>
                              )}
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
        <ModaleCampagne
          campagne={enEdition === 'nouvelle' ? null : enEdition}
          communes={communes}
          onFermer={() => setEnEdition(null)}
          onEnregistre={(texte) => {
            setMessage(texte);
            setEnEdition(null);
            void charger();
          }}
        />
      )}

      {detail && <ModaleDetail stats={detail} onFermer={() => setDetail(null)} />}

      {aArchiver && (
        <ConfirmationSuppression
          titre="Archiver cette campagne ?"
          message={`« ${aArchiver.nom} » passera au statut Clôturée et sortira des listes actives. Les dépistages rattachés restent intacts.`}
          libelleConfirmation="Archiver"
          onConfirmer={() => void archiver()}
          onAnnuler={() => setAArchiver(null)}
          enCours={action}
        />
      )}
    </>
  );
}

function ModaleCampagne({
  campagne,
  communes,
  onFermer,
  onEnregistre,
}: {
  campagne: Campagne | null;
  communes: Commune[];
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const edition = Boolean(campagne);
  const [valeurs, setValeurs] = useState({
    nom: campagne?.nom ?? '',
    commune_id: campagne?.commune_id ? String(campagne.commune_id) : '',
    date_debut: campagne?.date_debut ?? new Date().toISOString().slice(0, 10),
    date_fin: campagne?.date_fin ?? '',
    responsable: campagne?.responsable ?? '',
    statut: campagne?.statut ?? 'planifiee',
    description: campagne?.description ?? '',
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  /** Agents composant l'équipe, chargés depuis les affectations existantes. */
  const [equipe, setEquipe] = useState<number[]>([]);
  const [equipeInitiale, setEquipeInitiale] = useState<number[]>([]);

  useEffect(() => {
    if (!campagne) return;
    void apiAdmin<Paginated<Agent>>('/agents', {
      params: { campagneId: campagne.id, limit: 200 },
    })
      .then((resultat) => {
        const ids = resultat.items.map((agent) => agent.id);
        setEquipe(ids);
        setEquipeInitiale(ids);
      })
      .catch(() => undefined);
  }, [campagne]);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  /**
   * Applique la composition de l'équipe par différence.
   *
   * On n'efface pas tout pour recréer : une affectation porte ses dates, et
   * la recréer les perdrait. Seuls les ajouts et les retraits sont joués.
   */
  async function enregistrerEquipe(campagneId: number) {
    const ajouts = equipe.filter((id) => !equipeInitiale.includes(id));
    const retraits = equipeInitiale.filter((id) => !equipe.includes(id));

    for (const agentId of ajouts) {
      await apiAdmin(`/agents/${agentId}/affectations`, {
        method: 'POST',
        body: { campagne_id: campagneId },
      }).catch(() => undefined);
    }

    for (const agentId of retraits) {
      const fiche = await apiAdmin<Agent>(`/agents/${agentId}`).catch(() => null);
      const affectation = fiche?.affectations.find(
        (a) => a.campagne_id === campagneId && a.commune_id === null,
      );
      if (affectation) {
        await apiAdmin(`/agents/${agentId}/affectations/${affectation.id}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }
    }
  }

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur('');

    const corps = {
      nom: valeurs.nom,
      commune_id: valeurs.commune_id ? Number(valeurs.commune_id) : undefined,
      date_debut: valeurs.date_debut,
      date_fin: valeurs.date_fin || undefined,
      responsable: valeurs.responsable || undefined,
      statut: valeurs.statut,
      description: valeurs.description || undefined,
    };

    try {
      if (edition && campagne) {
        await apiAdmin(`/campagnes/${campagne.id}`, { method: 'PATCH', body: corps });
        await enregistrerEquipe(campagne.id);
        onEnregistre(`Campagne « ${valeurs.nom} » mise à jour.`);
      } else {
        const creee = await apiAdmin<Campagne>('/campagnes', {
          method: 'POST',
          body: corps,
        });
        await enregistrerEquipe(creee.id);
        onEnregistre(`Campagne « ${valeurs.nom} » créée.`);
      }
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={edition ? 'Modifier la campagne' : 'Nouvelle campagne'}
      onFermer={onFermer}
      large
    >
      <form onSubmit={soumettre}>
        {erreur && (
          <div className="mb-5">
            <Alerte type="erreur">{erreur}</Alerte>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nom" className="etiquette mb-2 block">
              Nom de la campagne *
            </label>
            <input
              id="nom"
              required
              value={valeurs.nom}
              onChange={(e) => maj('nom', e.target.value)}
              placeholder="Campagne de Cotonou — Août 2026"
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="commune" className="etiquette mb-2 block">
              Commune
            </label>
            <select
              id="commune"
              value={valeurs.commune_id}
              onChange={(e) => maj('commune_id', e.target.value)}
              className="admin-champ"
            >
              <option value="">—</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="statut" className="etiquette mb-2 block">
              Statut
            </label>
            <select
              id="statut"
              value={valeurs.statut}
              onChange={(e) => maj('statut', e.target.value)}
              className="admin-champ"
            >
              <option value="planifiee">Planifiée</option>
              <option value="en_cours">En cours</option>
              <option value="cloturee">Clôturée</option>
            </select>
          </div>

          <div>
            <label htmlFor="debut" className="etiquette mb-2 block">
              Date de début *
            </label>
            <input
              id="debut"
              type="date"
              required
              value={valeurs.date_debut}
              onChange={(e) => maj('date_debut', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="fin" className="etiquette mb-2 block">
              Date de fin
            </label>
            <input
              id="fin"
              type="date"
              value={valeurs.date_fin}
              onChange={(e) => maj('date_fin', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="responsable" className="etiquette mb-2 block">
              Responsable
            </label>
            <input
              id="responsable"
              value={valeurs.responsable}
              onChange={(e) => maj('responsable', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div className="sm:col-span-2">
            <span className="etiquette mb-2 block">Équipe</span>
            <EquipeCampagne selection={equipe} onChangement={setEquipe} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="etiquette mb-2 block">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={valeurs.description}
              onChange={(e) => maj('description', e.target.value)}
              className="admin-champ-multiligne"
            />
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="admin-bouton-clair">
            Annuler
          </button>
          <button type="submit" disabled={envoi} className="admin-bouton">
            {envoi ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>
    </Modale>
  );
}

function ModaleDetail({
  stats,
  onFermer,
}: {
  stats: StatsCampagne;
  onFermer: () => void;
}) {
  return (
    <Modale
      titre={stats.campagne.nom}
      sousTitre={`${stats.campagne.commune?.nom ?? 'Commune non renseignée'} · ${date(stats.campagne.date_debut)}`}
      onFermer={onFermer}
    >
      <div className="grid grid-cols-2 gap-px bg-admin-trait sm:grid-cols-4">
        {[
          { libelle: 'Dépistages', valeur: nombre(stats.depistages) },
          { libelle: 'Cas détectés', valeur: nombre(stats.cas) },
          { libelle: 'Taux', valeur: pourcentage(stats.taux) },
          { libelle: 'Orientés', valeur: nombre(stats.orientes) },
        ].map((carte) => (
          <div key={carte.libelle} className="bg-white px-5 py-4">
            <p className="etiquette">{carte.libelle}</p>
            <p className="mt-2 text-xl font-bold leading-none">{carte.valeur}</p>
          </div>
        ))}
      </div>

      {stats.parResultat.length > 0 && (
        <div className="mt-6">
          <h3 className="etiquette mb-3">Répartition des résultats</h3>
          <ul className="divide-y divide-admin-trait border-y border-admin-trait">
            {stats.parResultat.map((ligne) => (
              <li key={ligne.resultat} className="flex justify-between py-2.5 text-sm">
                <span>{ligne.resultat}</span>
                <span className="font-mono">{nombre(ligne.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.campagne.equipe && (
        <div className="mt-6">
          <h3 className="etiquette mb-2">Équipe</h3>
          <p className="text-sm">{stats.campagne.equipe}</p>
        </div>
      )}

      <div className="mt-7 flex justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            void telechargerFichier(
              `/campagnes/${stats.campagne.id}/rapport.pdf`,
              {},
              nomRapport(stats.campagne.nom),
            )
          }
          className="admin-bouton-clair"
        >
          Rapport PDF
        </button>
        <button type="button" onClick={onFermer} className="admin-bouton">
          Fermer
        </button>
      </div>
    </Modale>
  );
}

/**
 * Nom de repli du rapport téléchargé. Le serveur impose normalement le nom
 * via Content-Disposition ; celui-ci ne sert que si l'en-tête est illisible.
 */
function nomRapport(nomCampagne: string): string {
  const slug = nomCampagne
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `rapport-campagne-${slug}.pdf`;
}
