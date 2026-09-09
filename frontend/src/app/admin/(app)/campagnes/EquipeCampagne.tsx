'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiAdmin, ApiError } from '@/lib/api';
import type { Agent, Paginated, RoleTerrain } from '@/lib/types';

const LIBELLES_ROLE_TERRAIN: Record<RoleTerrain, string> = {
  agent: 'Agent',
  infirmier: 'Infirmier',
  superviseur: 'Superviseur',
  benevole: 'Bénévole',
};

/**
 * Composition de l'équipe d'une campagne.
 *
 * L'équipe n'est plus une ligne de texte libre mais un ensemble d'agents
 * réels, affectés à la campagne. Deux conséquences voulues : la collecte de
 * la campagne remonte dans les statistiques d'équipe de chaque membre, et le
 * suivi en direct sait à qui adresser un éloge ou un rappel.
 *
 * La sélection est remontée au parent plutôt qu'enregistrée ici : sur une
 * campagne en création, l'identifiant n'existe pas encore.
 */
export function EquipeCampagne({
  selection,
  onChangement,
}: {
  selection: number[];
  onChangement: (ids: number[]) => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recherche, setRecherche] = useState('');
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    try {
      const resultat = await apiAdmin<Paginated<Agent>>('/agents', {
        params: { actif: true, limit: 200 },
      });
      setAgents(resultat.items);
    } catch {
      setErreur('Liste des agents indisponible.');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const basculer = (id: number) =>
    onChangement(
      selection.includes(id)
        ? selection.filter((autre) => autre !== id)
        : [...selection, id],
    );

  const filtres = recherche.trim()
    ? agents.filter((agent) =>
        `${agent.prenom} ${agent.nom} ${agent.code_kobo ?? ''}`
          .toLocaleLowerCase()
          .includes(recherche.trim().toLocaleLowerCase()),
      )
    : agents;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Filtrer par nom ou matricule"
          aria-label="Filtrer les agents"
          className="admin-champ max-w-[16rem]"
        />
        <button
          type="button"
          onClick={() => setCreation(true)}
          className="admin-bouton-clair"
        >
          + Nouvel agent
        </button>
        {selection.length > 0 && (
          <span className="text-[0.8125rem] text-admin-gris">
            {selection.length} sélectionné{selection.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {erreur && (
        <p role="alert" className="mb-3 text-[0.8125rem] text-ablode-alerte">
          {erreur}
        </p>
      )}

      {agents.length === 0 ? (
        <p className="rounded-carte bg-admin-fond px-5 py-4 text-[0.8125rem] leading-relaxed text-admin-gris">
          Aucun agent enregistré. Créez-en un pour composer l’équipe : la
          collecte de la campagne lui sera rattachée.
        </p>
      ) : (
        <ul className="max-h-[220px] overflow-y-auto rounded-carte border border-admin-trait">
          {filtres.map((agent) => (
            <li key={agent.id} className="border-b border-admin-trait last:border-0">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-admin-fond">
                <input
                  type="checkbox"
                  checked={selection.includes(agent.id)}
                  onChange={() => basculer(agent.id)}
                  className="h-4 w-4 rounded border-admin-trait accent-admin-vert"
                />
                <span className="flex-1 text-sm font-semibold">
                  {agent.prenom} {agent.nom}
                </span>
                <span className="text-[0.75rem] text-admin-gris">
                  {LIBELLES_ROLE_TERRAIN[agent.role_terrain]}
                </span>
                {agent.code_kobo && (
                  <span className="font-mono text-[0.75rem] text-admin-gris">
                    {agent.code_kobo}
                  </span>
                )}
              </label>
            </li>
          ))}
          {filtres.length === 0 && (
            <li className="px-4 py-3 text-[0.8125rem] text-admin-gris">
              Aucun agent ne correspond.
            </li>
          )}
        </ul>
      )}

      <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
        Les dépistages de cette campagne compteront dans les statistiques
        d’équipe de chaque membre sélectionné, sans se mélanger à leur collecte
        personnelle.
      </p>

      {creation && (
        <CreationRapide
          onFermer={() => setCreation(false)}
          onCree={(agent) => {
            setAgents((courants) => [agent, ...courants]);
            onChangement([...selection, agent.id]);
            setCreation(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Création d'un agent sans quitter la campagne.
 *
 * Réduite au strict nécessaire — nom, prénom, matricule, rôle. Le reste de la
 * fiche se complète depuis la page Agents : imposer huit champs au milieu de
 * la création d'une campagne ferait abandonner la saisie.
 */
function CreationRapide({
  onFermer,
  onCree,
}: {
  onFermer: () => void;
  onCree: (agent: Agent) => void;
}) {
  const [valeurs, setValeurs] = useState({
    prenom: '',
    nom: '',
    code_kobo: '',
    role_terrain: 'agent' as RoleTerrain,
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    setEnvoi(true);
    setErreur('');
    try {
      onCree(
        await apiAdmin<Agent>('/agents', {
          method: 'POST',
          body: {
            prenom: valeurs.prenom.trim(),
            nom: valeurs.nom.trim(),
            code_kobo: valeurs.code_kobo.trim() || undefined,
            role_terrain: valeurs.role_terrain,
          },
        }),
      );
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Création impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mt-4 rounded-carte border border-admin-vert bg-admin-fond p-5">
      <h4 className="etiquette mb-4">Nouvel agent</h4>

      {erreur && (
        <p role="alert" className="mb-3 text-[0.8125rem] text-ablode-alerte">
          {erreur}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="eq-prenom" className="etiquette mb-2 block">
            Prénom *
          </label>
          <input
            id="eq-prenom"
            value={valeurs.prenom}
            onChange={(e) => setValeurs((c) => ({ ...c, prenom: e.target.value }))}
            className="admin-champ"
          />
        </div>
        <div>
          <label htmlFor="eq-nom" className="etiquette mb-2 block">
            Nom *
          </label>
          <input
            id="eq-nom"
            value={valeurs.nom}
            onChange={(e) => setValeurs((c) => ({ ...c, nom: e.target.value }))}
            className="admin-champ"
          />
        </div>
        <div>
          <label htmlFor="eq-code" className="etiquette mb-2 block">
            Matricule Kobo
          </label>
          <input
            id="eq-code"
            value={valeurs.code_kobo}
            onChange={(e) => setValeurs((c) => ({ ...c, code_kobo: e.target.value }))}
            placeholder="AG-014"
            className="admin-champ"
          />
        </div>
        <div>
          <label htmlFor="eq-role" className="etiquette mb-2 block">
            Rôle
          </label>
          <select
            id="eq-role"
            value={valeurs.role_terrain}
            onChange={(e) =>
              setValeurs((c) => ({ ...c, role_terrain: e.target.value as RoleTerrain }))
            }
            className="admin-champ"
          >
            {(Object.keys(LIBELLES_ROLE_TERRAIN) as RoleTerrain[]).map((role) => (
              <option key={role} value={role}>
                {LIBELLES_ROLE_TERRAIN[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onFermer} className="admin-bouton-clair">
          Annuler
        </button>
        <button
          type="button"
          disabled={envoi || !valeurs.prenom.trim() || !valeurs.nom.trim()}
          onClick={() => void creer()}
          className="admin-bouton"
        >
          {envoi ? 'Création…' : 'Créer et ajouter'}
        </button>
      </div>
    </div>
  );
}
