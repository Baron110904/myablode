'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alerte,
  Chargement,
  ConfirmationSuppression,
  EnTetePage,
  EtatVide,
} from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { FormulaireEvenement } from './FormulaireEvenement';
import { PanneauCampagne } from './PanneauCampagne';
import { apiAdmin, ApiError } from '@/lib/api';
import { date, etatEvenement, nombre, periodeEvenement } from '@/lib/format';
import type { Evenement } from '@/lib/types';

export default function PageEvenementsAdmin() {
  const { peut } = useAuth();
  const modifiable = peut('super_admin', 'admin');

  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [enEdition, setEnEdition] = useState<Evenement | null | 'nouveau'>(null);
  const [aSupprimer, setASupprimer] = useState<Evenement | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setEvenements(await apiAdmin<Evenement[]>('/evenements'));
      setErreur('');
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function supprimer() {
    if (!aSupprimer) return;
    setAction(true);
    try {
      await apiAdmin(`/evenements/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`« ${aSupprimer.titre} » retiré du programme.`);
      setASupprimer(null);
      await charger();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Suppression impossible.');
    } finally {
      setAction(false);
    }
  }

  /*
   * Le décompte doit appliquer exactement la règle du site, heure de retrait
   * comprise : sinon le back-office annonce « 2 sur le site » là où le
   * visiteur n'en voit qu'une, et l'administrateur cherche l'erreur ailleurs.
   */
  const visibles = evenements.filter(
    (evenement) =>
      evenement.publie &&
      etatEvenement(evenement.date_debut, evenement.date_fin).cle !== 'passe' &&
      (!evenement.date_retrait || new Date(evenement.date_retrait) > new Date()),
  ).length;

  return (
    <>
      <EnTetePage
        titre="Programme"
        complement={`${nombre(evenements.length)} dates · ${visibles} sur le site`}
        actions={
          modifiable ? (
            <button
              type="button"
              onClick={() => setEnEdition('nouveau')}
              className="admin-bouton"
            >
              + Ajouter une date
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

        <PanneauCampagne modifiable={modifiable} />

        <Alerte type="info">
          Ces dates alimentent le bandeau de la page d’accueil et l’encart
          «&#8239;Les grandes dates&#8239;». Seules les dates à venir y figurent&#8239;:
          une date passée s’efface d’elle-même du site, mais reste modifiable ici.
        </Alerte>

        <div className="admin-panneau">
          {chargement ? (
            <Chargement />
          ) : evenements.length === 0 ? (
            <EtatVide
              message="Aucune date au programme."
              action={
                modifiable ? (
                  <button
                    type="button"
                    onClick={() => setEnEdition('nouveau')}
                    className="admin-bouton-clair"
                  >
                    Ajouter la première date
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Période</th>
                    <th className="admin-th">Titre</th>
                    <th className="admin-th">Lieu</th>
                    <th className="admin-th">Édition</th>
                    <th className="admin-th">Sur le site</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {evenements.map((evenement) => {
                    const etat = etatEvenement(evenement.date_debut, evenement.date_fin);
                    // Une heure de retrait dépassée sort la date du site aussi
                    // sûrement qu'une dépublication : la pastille doit le dire.
                    const retiree = Boolean(
                      evenement.date_retrait && new Date(evenement.date_retrait) <= new Date(),
                    );
                    const affiche = evenement.publie && etat.cle !== 'passe' && !retiree;

                    return (
                      <tr
                        key={evenement.id}
                        className="transition-colors duration-150 hover:bg-admin-fond"
                      >
                        <td className="admin-td whitespace-nowrap">
                          <span className="block font-bold">
                            {periodeEvenement(evenement.date_debut, evenement.date_fin)}
                          </span>
                          <span className="mt-0.5 block text-[0.75rem] text-admin-gris">
                            {date(evenement.date_debut)}
                          </span>
                        </td>
                        <td className="admin-td max-w-sm">
                          <span className="block truncate font-bold">{evenement.titre}</span>
                          {evenement.sous_titre && (
                            <span className="mt-0.5 block truncate text-[0.8125rem] text-admin-gris">
                              {evenement.sous_titre}
                            </span>
                          )}
                        </td>
                        <td className="admin-td">{evenement.lieu ?? '-'}</td>
                        <td className="admin-td">{evenement.edition ?? '-'}</td>
                        <td className="admin-td">
                          <span
                            className={`pastille ${
                              !affiche
                                ? 'pastille-neutre'
                                : etat.cle === 'en_cours' || etat.cle === 'aujourdhui'
                                  ? 'pastille-normal'
                                  : 'pastille-attention'
                            }`}
                          >
                            {!evenement.publie
                              ? 'Masquée'
                              : retiree
                                ? 'Retirée'
                                : etat.libelle}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          {modifiable && (
                            <span className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setEnEdition(evenement)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => setASupprimer(evenement)}
                                className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                              >
                                Supprimer
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {enEdition && (
        <FormulaireEvenement
          evenement={enEdition === 'nouveau' ? null : enEdition}
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
          titre="Retirer cette date ?"
          message={`« ${aSupprimer.titre} » disparaîtra du programme et de la page d’accueil. Cette action est irréversible.`}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}
