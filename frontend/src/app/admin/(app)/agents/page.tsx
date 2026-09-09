'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { apiAdmin, ApiError } from '@/lib/api';
import { date, nombre, pourcentage } from '@/lib/format';
import type {
  Agent,
  Campagne,
  Commune,
  Paginated,
  RoleTerrain,
  StatsAgent,
} from '@/lib/types';

const VIDE: Paginated<Agent> = { items: [], total: 0, page: 1, limit: 20, pages: 1 };

const ROLES: Array<{ valeur: RoleTerrain; libelle: string }> = [
  { valeur: 'agent', libelle: 'Agent de terrain' },
  { valeur: 'infirmier', libelle: 'Infirmier' },
  { valeur: 'superviseur', libelle: 'Superviseur' },
  { valeur: 'benevole', libelle: 'Bénévole' },
];

const LIBELLES_ROLE_TERRAIN: Record<RoleTerrain, string> = {
  agent: 'Agent de terrain',
  infirmier: 'Infirmier',
  superviseur: 'Superviseur',
  benevole: 'Bénévole',
};

export default function PageAgents() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [donnees, setDonnees] = useState<Paginated<Agent>>(VIDE);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [rechercheSaisie, setRechercheSaisie] = useState('');
  const [role, setRole] = useState<RoleTerrain | 'tous'>('tous');
  const [campagneId, setCampagneId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [inclureInactifs, setInclureInactifs] = useState(false);

  const [enEdition, setEnEdition] = useState<Agent | 'nouveau' | null>(null);
  const [fiche, setFiche] = useState<Agent | null>(null);
  const [aDesactiver, setADesactiver] = useState<Agent | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<Agent>>('/agents', {
          params: {
            page,
            limit: 20,
            recherche: recherche || undefined,
            role_terrain: role === 'tous' ? undefined : role,
            campagneId: campagneId || undefined,
            communeId: communeId || undefined,
            // `actif` n'est envoyé que pour restreindre : absent, l'API rend tout.
            actif: inclureInactifs ? undefined : true,
          },
        }),
      );
      setErreur('');
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.');
    } finally {
      setChargement(false);
    }
  }, [page, recherche, role, campagneId, communeId, inclureInactifs]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    void apiAdmin<Commune[]>('/communes')
      .then(setCommunes)
      .catch(() => undefined);
    void apiAdmin<Paginated<Campagne>>('/campagnes', { params: { limit: 100 } })
      .then((resultat) => setCampagnes(resultat.items))
      .catch(() => undefined);
  }, []);

  async function desactiver() {
    if (!aDesactiver) return;
    setAction(true);
    try {
      await apiAdmin(`/agents/${aDesactiver.id}`, { method: 'DELETE' });
      setMessage(`${aDesactiver.prenom} ${aDesactiver.nom} n’est plus en activité.`);
      setADesactiver(null);
      await charger();
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Désactivation impossible.',
      );
    } finally {
      setAction(false);
    }
  }

  const filtreActif =
    Boolean(recherche) || role !== 'tous' || Boolean(campagneId) || Boolean(communeId);

  return (
    <>
      <EnTetePage
        titre="Agents de terrain"
        complement={`${nombre(donnees.total)} ${donnees.total === 1 ? 'agent' : 'agents'}`}
        actions={
          modifiable ? (
            <button
              type="button"
              onClick={() => setEnEdition('nouveau')}
              className="admin-bouton"
            >
              + Nouvel agent
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
          <div className="space-y-3 border-b border-admin-trait p-4">
            <form
              onSubmit={(evenement) => {
                evenement.preventDefault();
                setPage(1);
                setRecherche(rechercheSaisie);
              }}
              className="flex flex-wrap gap-2"
            >
              <input
                value={rechercheSaisie}
                onChange={(e) => setRechercheSaisie(e.target.value)}
                placeholder="Nom, prénom ou matricule Kobo"
                aria-label="Rechercher un agent"
                className="admin-champ max-w-xs"
              />
              <button type="submit" className="admin-bouton-clair">
                Rechercher
              </button>
              {filtreActif && (
                <button
                  type="button"
                  onClick={() => {
                    setRechercheSaisie('');
                    setRecherche('');
                    setRole('tous');
                    setCampagneId('');
                    setCommuneId('');
                    setPage(1);
                  }}
                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                >
                  Tout effacer
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setRole('tous');
                }}
                aria-pressed={role === 'tous'}
                className={`puce-filtre ${role === 'tous' ? 'puce-filtre-active' : ''}`}
              >
                Tous les rôles
              </button>
              {ROLES.map((entree) => (
                <button
                  key={entree.valeur}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setRole(entree.valeur);
                  }}
                  aria-pressed={role === entree.valeur}
                  className={`puce-filtre ${role === entree.valeur ? 'puce-filtre-active' : ''}`}
                >
                  {entree.libelle}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={campagneId}
                onChange={(e) => {
                  setPage(1);
                  setCampagneId(e.target.value);
                }}
                aria-label="Filtrer par campagne"
                className="admin-champ max-w-[16rem]"
              >
                <option value="">Toutes les campagnes</option>
                {campagnes.map((campagne) => (
                  <option key={campagne.id} value={campagne.id}>
                    {campagne.nom}
                  </option>
                ))}
              </select>

              <select
                value={communeId}
                onChange={(e) => {
                  setPage(1);
                  setCommuneId(e.target.value);
                }}
                aria-label="Filtrer par commune"
                className="admin-champ max-w-[14rem]"
              >
                <option value="">Toutes les communes</option>
                {communes.map((commune) => (
                  <option key={commune.id} value={commune.id}>
                    {commune.nom}
                  </option>
                ))}
              </select>

              <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-admin-gris">
                <input
                  type="checkbox"
                  checked={inclureInactifs}
                  onChange={(e) => {
                    setPage(1);
                    setInclureInactifs(e.target.checked);
                  }}
                  className="h-4 w-4 rounded border-admin-trait accent-admin-vert"
                />
                Afficher les agents plus en activité
              </label>
            </div>
          </div>

          {chargement ? (
            <Chargement />
          ) : donnees.items.length === 0 ? (
            <EtatVide
              message={
                filtreActif
                  ? 'Aucun agent ne correspond à ces filtres.'
                  : 'Aucun agent enregistré. Créez-en un pour rattacher les dépistages collectés sur le terrain.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Agent</th>
                    <th className="admin-th">Matricule Kobo</th>
                    <th className="admin-th">Rôle</th>
                    <th className="admin-th">Contact</th>
                    <th className="admin-th">Affectations</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((agent) => (
                    <tr
                      key={agent.id}
                      className="transition-colors duration-150 hover:bg-admin-fond"
                    >
                      <td className="admin-td">
                        <button
                          type="button"
                          onClick={() => setFiche(agent)}
                          className="text-left font-bold hover:text-admin-vert"
                        >
                          {agent.prenom} {agent.nom}
                        </button>
                        {!agent.actif && (
                          <span className="pastille pastille-neutre ml-2">
                            Plus en activité
                          </span>
                        )}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {agent.code_kobo ?? '—'}
                      </td>
                      <td className="admin-td">{LIBELLES_ROLE_TERRAIN[agent.role_terrain]}</td>
                      <td className="admin-td text-[0.8125rem] text-admin-gris">
                        {agent.telephone ?? agent.email ?? '—'}
                      </td>
                      <td className="admin-td">
                        {agent.affectations.length === 0 ? (
                          <span className="text-admin-gris">Aucune</span>
                        ) : (
                          <span className="flex flex-wrap gap-1.5">
                            {agent.affectations.slice(0, 3).map((affectation) => (
                              <span
                                key={affectation.id}
                                className="pastille pastille-normal"
                              >
                                {libelleAffectation(affectation)}
                              </span>
                            ))}
                            {agent.affectations.length > 3 && (
                              <span className="pastille pastille-neutre">
                                +{agent.affectations.length - 3}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="admin-td text-right">
                        <span className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setFiche(agent)}
                            className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                          >
                            Fiche
                          </button>
                          {modifiable && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEnEdition(agent)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                              >
                                Modifier
                              </button>
                              {agent.actif && (
                                <button
                                  type="button"
                                  onClick={() => setADesactiver(agent)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                                >
                                  Désactiver
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
        <ModaleAgent
          agent={enEdition === 'nouveau' ? null : enEdition}
          onFermer={() => setEnEdition(null)}
          onEnregistre={(texte) => {
            setMessage(texte);
            setEnEdition(null);
            void charger();
          }}
        />
      )}

      {fiche && (
        <ModaleFiche
          agent={fiche}
          communes={communes}
          campagnes={campagnes}
          modifiable={modifiable}
          onFermer={() => setFiche(null)}
          onChangement={() => void charger()}
        />
      )}

      {aDesactiver && (
        <ConfirmationSuppression
          titre="Retirer cet agent de l’activité ?"
          message={`${aDesactiver.prenom} ${aDesactiver.nom} sortira des listes actives. Ses dépistages déjà collectés restent rattachés à son nom — rien n’est effacé.`}
          libelleConfirmation="Désactiver"
          onConfirmer={() => void desactiver()}
          onAnnuler={() => setADesactiver(null)}
          enCours={action}
        />
      )}
    </>
  );
}

/** « Campagne X · Commune Y », en n'affichant que ce qui est renseigné. */
function libelleAffectation(affectation: {
  campagne?: { nom: string } | null;
  commune?: { nom: string } | null;
}): string {
  const parts = [affectation.campagne?.nom, affectation.commune?.nom].filter(Boolean);
  return parts.join(' · ') || 'Périmètre inconnu';
}

function ModaleAgent({
  agent,
  onFermer,
  onEnregistre,
}: {
  agent: Agent | null;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const edition = Boolean(agent);
  const [valeurs, setValeurs] = useState({
    nom: agent?.nom ?? '',
    prenom: agent?.prenom ?? '',
    code_kobo: agent?.code_kobo ?? '',
    telephone: agent?.telephone ?? '',
    email: agent?.email ?? '',
    role_terrain: agent?.role_terrain ?? ('agent' as RoleTerrain),
    notes: agent?.notes ?? '',
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur('');

    const corps = {
      nom: valeurs.nom.trim(),
      prenom: valeurs.prenom.trim(),
      code_kobo: valeurs.code_kobo.trim() || undefined,
      telephone: valeurs.telephone.trim() || undefined,
      email: valeurs.email.trim() || undefined,
      role_terrain: valeurs.role_terrain,
      notes: valeurs.notes.trim() || undefined,
    };

    try {
      if (edition && agent) {
        await apiAdmin(`/agents/${agent.id}`, { method: 'PATCH', body: corps });
        onEnregistre(`Fiche de ${corps.prenom} ${corps.nom} mise à jour.`);
      } else {
        await apiAdmin('/agents', { method: 'POST', body: corps });
        onEnregistre(`${corps.prenom} ${corps.nom} ajouté aux agents de terrain.`);
      }
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={edition ? 'Modifier l’agent' : 'Nouvel agent'} onFermer={onFermer} large>
      <form onSubmit={soumettre}>
        {erreur && (
          <div className="mb-5">
            <Alerte type="erreur">{erreur}</Alerte>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="prenom" className="etiquette mb-2 block">
              Prénom *
            </label>
            <input
              id="prenom"
              required
              value={valeurs.prenom}
              onChange={(e) => maj('prenom', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="nom" className="etiquette mb-2 block">
              Nom *
            </label>
            <input
              id="nom"
              required
              value={valeurs.nom}
              onChange={(e) => maj('nom', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="code_kobo" className="etiquette mb-2 block">
              Matricule Kobo
            </label>
            <input
              id="code_kobo"
              value={valeurs.code_kobo}
              onChange={(e) => maj('code_kobo', e.target.value)}
              placeholder="AG-014"
              className="admin-champ"
            />
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-admin-gris">
              Le matricule que l’agent saisit dans le formulaire KoboCollect. C’est
              lui qui rattache les dépistages collectés à cette fiche.
            </p>
          </div>

          <div>
            <label htmlFor="role_terrain" className="etiquette mb-2 block">
              Rôle
            </label>
            <select
              id="role_terrain"
              value={valeurs.role_terrain}
              onChange={(e) => maj('role_terrain', e.target.value)}
              className="admin-champ"
            >
              {ROLES.map((entree) => (
                <option key={entree.valeur} value={entree.valeur}>
                  {entree.libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="telephone" className="etiquette mb-2 block">
              Téléphone
            </label>
            <input
              id="telephone"
              value={valeurs.telephone}
              onChange={(e) => maj('telephone', e.target.value)}
              placeholder="97 00 00 00"
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="email" className="etiquette mb-2 block">
              Courriel
            </label>
            <input
              id="email"
              type="email"
              value={valeurs.email}
              onChange={(e) => maj('email', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="etiquette mb-2 block">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={valeurs.notes}
              onChange={(e) => maj('notes', e.target.value)}
              placeholder="Formation, zone d’habitude, moyen de déplacement…"
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

/**
 * Fiche d'un agent : sa collecte, ses affectations, et de quoi en ajouter.
 *
 * Les affectations sont rechargées depuis l'API plutôt que reprises de la
 * liste : la modale reste ouverte pendant qu'on en ajoute, et la ligne du
 * tableau derrière est déjà périmée.
 */
function ModaleFiche({
  agent,
  communes,
  campagnes,
  modifiable,
  onFermer,
  onChangement,
}: {
  agent: Agent;
  communes: Commune[];
  campagnes: Campagne[];
  modifiable: boolean;
  onFermer: () => void;
  onChangement: () => void;
}) {
  const [courant, setCourant] = useState<Agent>(agent);
  const [stats, setStats] = useState<StatsAgent | null>(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [nouvelle, setNouvelle] = useState({
    campagne_id: '',
    commune_id: '',
    date_debut: '',
    date_fin: '',
  });

  const rafraichir = useCallback(async () => {
    try {
      setCourant(await apiAdmin<Agent>(`/agents/${agent.id}`));
    } catch {
      /* La fiche affichée reste celle de la liste : rien de bloquant. */
    }
  }, [agent.id]);

  useEffect(() => {
    void apiAdmin<StatsAgent>(`/agents/${agent.id}/statistiques`)
      .then(setStats)
      .catch(() => undefined);
  }, [agent.id]);

  async function affecter(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (!nouvelle.campagne_id && !nouvelle.commune_id) {
      setErreur('Choisissez au moins une campagne ou une commune.');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      await apiAdmin(`/agents/${agent.id}/affectations`, {
        method: 'POST',
        body: {
          campagne_id: nouvelle.campagne_id ? Number(nouvelle.campagne_id) : undefined,
          commune_id: nouvelle.commune_id ? Number(nouvelle.commune_id) : undefined,
          date_debut: nouvelle.date_debut || undefined,
          date_fin: nouvelle.date_fin || undefined,
        },
      });
      setNouvelle({ campagne_id: '', commune_id: '', date_debut: '', date_fin: '' });
      await rafraichir();
      onChangement();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Affectation impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(affectationId: number) {
    try {
      await apiAdmin(`/agents/${agent.id}/affectations/${affectationId}`, {
        method: 'DELETE',
      });
      await rafraichir();
      onChangement();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Retrait impossible.');
    }
  }

  return (
    <Modale
      titre={`${courant.prenom} ${courant.nom}`}
      sousTitre={`${LIBELLES_ROLE_TERRAIN[courant.role_terrain]}${
        courant.code_kobo ? ` · matricule ${courant.code_kobo}` : ''
      }`}
      onFermer={onFermer}
      large
    >
      {erreur && (
        <div className="mb-5">
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-admin-trait sm:grid-cols-4">
        {[
          { libelle: 'Dépistages collectés', valeur: nombre(stats?.depistages ?? 0) },
          { libelle: 'Cas détectés', valeur: nombre(stats?.cas ?? 0) },
          {
            libelle: 'Taux',
            valeur:
              stats && stats.depistages > 0
                ? pourcentage((100 * stats.cas) / stats.depistages)
                : '—',
          },
          { libelle: 'Communes couvertes', valeur: nombre(stats?.communes ?? 0) },
        ].map((carte) => (
          <div key={carte.libelle} className="bg-white px-5 py-4">
            <p className="etiquette">{carte.libelle}</p>
            <p className="mt-2 text-xl font-bold leading-none">{carte.valeur}</p>
          </div>
        ))}
      </div>

      {stats && stats.depistages === 0 && (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-admin-gris">
          Aucun dépistage rattaché pour l’instant. Le rattachement se fait par le
          matricule Kobo : sans matricule renseigné ici, ou sans matricule saisi
          dans le formulaire, la collecte reste anonyme.
        </p>
      )}

      <section className="mt-7">
        <h3 className="etiquette mb-3">Affectations</h3>
        {courant.affectations.length === 0 ? (
          <p className="text-sm text-admin-gris">
            Aucune affectation. L’agent peut collecter partout.
          </p>
        ) : (
          <ul className="divide-y divide-admin-trait border-y border-admin-trait">
            {courant.affectations.map((affectation) => (
              <li
                key={affectation.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>
                  <span className="text-sm font-semibold">
                    {libelleAffectation(affectation)}
                  </span>
                  {(affectation.date_debut || affectation.date_fin) && (
                    <span className="ml-3 font-mono text-[0.75rem] text-admin-gris">
                      {affectation.date_debut ? date(affectation.date_debut) : '…'} →{' '}
                      {affectation.date_fin ? date(affectation.date_fin) : '…'}
                    </span>
                  )}
                </span>
                {modifiable && (
                  <button
                    type="button"
                    onClick={() => void retirer(affectation.id)}
                    className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {modifiable && (
        <form onSubmit={affecter} className="mt-6 rounded-carte bg-admin-fond p-5">
          <h3 className="etiquette mb-4">Nouvelle affectation</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="aff-campagne" className="etiquette mb-2 block">
                Campagne
              </label>
              <select
                id="aff-campagne"
                value={nouvelle.campagne_id}
                onChange={(e) =>
                  setNouvelle((c) => ({ ...c, campagne_id: e.target.value }))
                }
                className="admin-champ"
              >
                <option value="">Toutes les campagnes</option>
                {campagnes.map((campagne) => (
                  <option key={campagne.id} value={campagne.id}>
                    {campagne.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="aff-commune" className="etiquette mb-2 block">
                Commune
              </label>
              <select
                id="aff-commune"
                value={nouvelle.commune_id}
                onChange={(e) =>
                  setNouvelle((c) => ({ ...c, commune_id: e.target.value }))
                }
                className="admin-champ"
              >
                <option value="">Toutes les communes</option>
                {communes.map((commune) => (
                  <option key={commune.id} value={commune.id}>
                    {commune.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="aff-debut" className="etiquette mb-2 block">
                À partir du
              </label>
              <input
                id="aff-debut"
                type="date"
                value={nouvelle.date_debut}
                onChange={(e) =>
                  setNouvelle((c) => ({ ...c, date_debut: e.target.value }))
                }
                className="admin-champ"
              />
            </div>

            <div>
              <label htmlFor="aff-fin" className="etiquette mb-2 block">
                Jusqu’au
              </label>
              <input
                id="aff-fin"
                type="date"
                value={nouvelle.date_fin}
                onChange={(e) => setNouvelle((c) => ({ ...c, date_fin: e.target.value }))}
                className="admin-champ"
              />
            </div>
          </div>

          <p className="mt-4 text-[0.8125rem] leading-relaxed text-admin-gris">
            Laissez un champ sur « toutes » pour affecter largement : une campagne
            entière, ou une commune quelle que soit la campagne.
          </p>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={envoi} className="admin-bouton">
              {envoi ? 'Enregistrement…' : 'Affecter'}
            </button>
          </div>
        </form>
      )}

      {courant.notes && (
        <section className="mt-6">
          <h3 className="etiquette mb-2">Notes</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">{courant.notes}</p>
        </section>
      )}

      <div className="mt-7 flex justify-end">
        <button type="button" onClick={onFermer} className="admin-bouton">
          Fermer
        </button>
      </div>
    </Modale>
  );
}
