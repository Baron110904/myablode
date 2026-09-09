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
import { ModaleImport } from './ModaleImport';
import { ModaleSaisie } from './ModaleSaisie';
import { ModaleExport } from './ModaleExport';
import { apiAdmin, ApiError } from '@/lib/api';
import {
  age,
  classePastilleResultat,
  dateCourte,
  LIBELLES_RESULTAT,
  LIBELLES_SOURCE,
  nombre,
} from '@/lib/format';
import type {
  Campagne,
  Commune,
  Depistage,
  Paginated,
  ResultatDepistage,
} from '@/lib/types';

const FILTRES_RESULTAT: Array<{ valeur: ResultatDepistage | 'tous'; libelle: string }> = [
  { valeur: 'tous', libelle: 'Tous' },
  { valeur: 'normal', libelle: 'Normal' },
  { valeur: 'pre-diabete', libelle: 'Pré-diabète' },
  { valeur: 'diabete', libelle: 'Diabète' },
  { valeur: 'obesite', libelle: 'Obésité' },
  { valeur: 'a_verifier', libelle: 'À vérifier' },
];

const VIDE: Paginated<Depistage> = { items: [], total: 0, page: 1, limit: 25, pages: 1 };

export default function PageDepistages() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [donnees, setDonnees] = useState<Paginated<Depistage>>(VIDE);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [rechercheActive, setRechercheActive] = useState('');
  const [resultat, setResultat] = useState<ResultatDepistage | 'tous'>('tous');
  /** Filtre de reprise : les mesures signalées hors des bornes physiologiques. */
  const [horsNorme, setHorsNorme] = useState(false);
  const [communeId, setCommuneId] = useState<string>('');

  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [modale, setModale] = useState<'import' | 'saisie' | 'export' | null>(null);
  const [enEdition, setEnEdition] = useState<Depistage | null>(null);
  const [aSupprimer, setASupprimer] = useState<Depistage | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiAdmin<Paginated<Depistage>>('/depistages', {
        params: {
          page,
          limit: 25,
          recherche: rechercheActive || undefined,
          resultat: resultat === 'tous' ? undefined : resultat,
          communeId: communeId || undefined,
          horsNorme: horsNorme || undefined,
        },
      });
      setDonnees(reponse);
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError
          ? erreurAttrapee.message
          : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [page, rechercheActive, resultat, communeId, horsNorme]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    void (async () => {
      try {
        const [listeCommunes, listeCampagnes] = await Promise.all([
          apiAdmin<Commune[]>('/communes'),
          apiAdmin<Paginated<Campagne>>('/campagnes', { params: { limit: 200 } }),
        ]);
        setCommunes(listeCommunes);
        setCampagnes(listeCampagnes.items);
      } catch {
        // Les référentiels ne bloquent pas la consultation de la liste.
      }
    })();
  }, []);

  // Tout changement de filtre invalide la sélection : les lignes cochées ne
  // sont plus forcément à l'écran.
  useEffect(() => {
    setSelection(new Set());
  }, [page, rechercheActive, resultat, communeId, horsNorme]);

  function basculerSelection(id: number) {
    setSelection((courante) => {
      const copie = new Set(courante);
      if (copie.has(id)) copie.delete(id);
      else copie.add(id);
      return copie;
    });
  }

  function basculerTout() {
    setSelection((courante) =>
      courante.size === donnees.items.length
        ? new Set()
        : new Set(donnees.items.map((item) => item.id)),
    );
  }

  /**
   * Validation d'une seule ligne.
   *
   * Valider ne corrige pas la mesure : cela dit qu'un humain a relu la ligne.
   * Une mesure hors norme relue reste « à reprendre » — on a constaté que la
   * valeur était inexploitable, ce qui est une information en soi. Pour lever
   * le signalement, il faut corriger la mesure via « Corriger ».
   */
  async function validerUn(id: number, verifie: boolean) {
    try {
      await apiAdmin('/depistages/validation-masse', {
        method: 'POST',
        body: { ids: [id], verifie },
      });
      await charger();
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Validation impossible.',
      );
    }
  }

  async function validerSelection(verifie: boolean) {
    if (selection.size === 0) return;
    setAction(true);
    try {
      const reponse = await apiAdmin<{ message: string }>('/depistages/validation-masse', {
        method: 'POST',
        body: { ids: [...selection], verifie },
      });
      setMessage(reponse.message);
      setSelection(new Set());
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Action impossible.',
      );
    } finally {
      setAction(false);
    }
  }

  async function supprimer() {
    if (!aSupprimer) return;
    setAction(true);
    try {
      await apiAdmin(`/depistages/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`Dépistage de ${aSupprimer.prenom} ${aSupprimer.nom} archivé.`);
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
        titre="Dépistages"
        complement={`${nombre(donnees.total)} enregistrements`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setModale('export')}
              className="admin-bouton-clair"
            >
              Exporter
            </button>
            {modifiable && (
              <>
                <button
                  type="button"
                  onClick={() => setModale('import')}
                  className="admin-bouton-clair"
                >
                  Importer CSV / XLS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnEdition(null);
                    setModale('saisie');
                  }}
                  className="admin-bouton"
                >
                  + Saisie manuelle
                </button>
              </>
            )}
          </>
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
          <div className="flex flex-wrap items-center gap-3 border-b border-admin-trait p-4">
            <form
              onSubmit={(evenement) => {
                evenement.preventDefault();
                setPage(1);
                setRechercheActive(recherche.trim());
              }}
              className="flex min-w-[240px] flex-1 gap-2"
              role="search"
            >
              <label htmlFor="recherche" className="sr-only">
                Rechercher
              </label>
              <input
                id="recherche"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un nom, un code, un téléphone…"
                className="admin-champ"
              />
              <button type="submit" className="admin-bouton-clair shrink-0">
                OK
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {/*
                Séparé des filtres de résultat : « hors norme » ne parle pas de
                clinique mais de qualité de la mesure, et se cumule avec eux.
              */}
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setHorsNorme((courant) => !courant);
                }}
                aria-pressed={horsNorme}
                className={`puce-filtre ${
                  horsNorme ? '!border-ablode-ambre !bg-ablode-ambre-voile !text-ablode-ambre' : ''
                }`}
              >
                Hors norme
              </button>

              {FILTRES_RESULTAT.map((filtre) => (
                <button
                  key={filtre.valeur}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setResultat(filtre.valeur);
                  }}
                  aria-pressed={resultat === filtre.valeur}
                  className={`puce-filtre ${resultat === filtre.valeur ? 'puce-filtre-active' : ''}`}
                >
                  {filtre.libelle}
                </button>
              ))}
            </div>

            <label htmlFor="commune" className="sr-only">
              Filtrer par commune
            </label>
            <select
              id="commune"
              value={communeId}
              onChange={(e) => {
                setPage(1);
                setCommuneId(e.target.value);
              }}
              className="admin-champ w-auto min-w-[170px]"
            >
              <option value="">Toutes les communes</option>
              {communes.map((commune) => (
                <option key={commune.id} value={commune.id}>
                  {commune.nom}
                </option>
              ))}
            </select>
          </div>

          {selection.size > 0 && modifiable && (
            <div className="flex flex-wrap items-center gap-3 border-b border-admin-trait bg-admin-actif px-4 py-3">
              <span className="text-[0.8125rem] font-semibold">
                {selection.size} sélectionné(s)
              </span>
              <button
                type="button"
                onClick={() => void validerSelection(true)}
                disabled={action}
                className="admin-bouton-clair"
              >
                Marquer vérifiés
              </button>
              <button
                type="button"
                onClick={() => void validerSelection(false)}
                disabled={action}
                className="admin-bouton-clair"
              >
                Retirer la vérification
              </button>
              <button
                type="button"
                onClick={() => setSelection(new Set())}
                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
              >
                Annuler
              </button>
            </div>
          )}

          {chargement ? (
            <Chargement />
          ) : donnees.items.length === 0 ? (
            <EtatVide message="Aucun dépistage ne correspond à ces critères." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    {modifiable && (
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            selection.size > 0 && selection.size === donnees.items.length
                          }
                          onChange={basculerTout}
                          aria-label="Tout sélectionner"
                          className="h-4 w-4 accent-admin-encre"
                        />
                      </th>
                    )}
                    <th className="admin-th">Code</th>
                    <th className="admin-th">Nom</th>
                    <th className="admin-th">Commune</th>
                    <th className="admin-th">Sexe</th>
                    <th className="admin-th">Âge</th>
                    <th className="admin-th">Date</th>
                    <th className="admin-th">Résultat</th>
                    <th className="admin-th">Source</th>
                    <th className="admin-th">Statut</th>
                    {modifiable && <th className="admin-th text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((depistage) => (
                    <tr key={depistage.id} className="transition-colors duration-150 hover:bg-admin-fond">
                      {modifiable && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selection.has(depistage.id)}
                            onChange={() => basculerSelection(depistage.id)}
                            aria-label={`Sélectionner ${depistage.prenom} ${depistage.nom}`}
                            className="h-4 w-4 accent-admin-encre"
                          />
                        </td>
                      )}
                      <td className="admin-td whitespace-nowrap font-mono text-[0.8125rem] text-admin-gris">
                        {depistage.code_unique ?? '—'}
                      </td>
                      <td className="admin-td whitespace-nowrap font-bold">
                        {depistage.prenom} {depistage.nom}
                      </td>
                      <td className="admin-td">{depistage.commune?.nom ?? '—'}</td>
                      <td className="admin-td">{depistage.sexe}</td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {age(depistage.date_naissance, depistage.date_depistage) ?? '—'}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {dateCourte(depistage.date_depistage)}
                      </td>
                      <td className="admin-td">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={classePastilleResultat(depistage.resultat)}>
                            {LIBELLES_RESULTAT[depistage.resultat]}
                          </span>
                          {/*
                            Marque de reprise. Le motif est dans l'infobulle :
                            en colonne, il ferait déborder toutes les lignes.
                          */}
                          {depistage.hors_norme && (
                            <span
                              title={depistage.motif_hors_norme ?? 'Mesure hors norme'}
                              className="pastille pastille-attention cursor-help"
                            >
                              Hors norme
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem] text-admin-gris">
                        {LIBELLES_SOURCE[depistage.source]}
                      </td>
                      <td className="admin-td">
                        {/*
                          « Relu » plutôt que « vérifié » : le mot « à vérifier »
                          désignait aussi le résultat d'une mesure inexploitable,
                          et les deux colonnes se contredisaient à l'œil.
                        */}
                        <span
                          className={`text-[0.8125rem] font-semibold ${
                            depistage.verifie ? 'text-admin-vert' : 'text-admin-gris'
                          }`}
                        >
                          {depistage.verifie ? 'Relu' : 'Non relu'}
                        </span>
                      </td>
                      {modifiable && (
                        <td className="admin-td text-right">
                          <span className="flex justify-end gap-3">
                            {!depistage.verifie && (
                              <button
                                type="button"
                                onClick={() => void validerUn(depistage.id, true)}
                                className="text-[0.8125rem] font-medium text-admin-vert hover:underline"
                              >
                                Valider
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEnEdition(depistage);
                                setModale('saisie');
                              }}
                              className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                            >
                              {depistage.hors_norme ? 'Corriger' : 'Modifier'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setASupprimer(depistage)}
                              className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                            >
                              Archiver
                            </button>
                          </span>
                        </td>
                      )}
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

      {modale === 'import' && (
        <ModaleImport
          campagnes={campagnes}
          onFermer={() => setModale(null)}
          onTermine={(rapport) => {
            setMessage(rapport.message);
            setModale(null);
            void charger();
          }}
        />
      )}

      {modale === 'saisie' && (
        <ModaleSaisie
          depistage={enEdition}
          communes={communes}
          campagnes={campagnes}
          onFermer={() => {
            setModale(null);
            setEnEdition(null);
          }}
          onEnregistre={(texte) => {
            setMessage(texte);
            setModale(null);
            setEnEdition(null);
            void charger();
          }}
        />
      )}

      {modale === 'export' && (
        <ModaleExport
          filtres={{
            recherche: rechercheActive || undefined,
            resultat: resultat === 'tous' ? undefined : resultat,
            communeId: communeId || undefined,
          }}
          onFermer={() => setModale(null)}
        />
      )}

      {aSupprimer && (
        <ConfirmationSuppression
          titre="Archiver ce dépistage ?"
          message={`L'enregistrement de ${aSupprimer.prenom} ${aSupprimer.nom} sera retiré des statistiques mais conservé en base et dans le journal d'audit. Un super administrateur pourra le restaurer.`}
          libelleConfirmation="Archiver"
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}
