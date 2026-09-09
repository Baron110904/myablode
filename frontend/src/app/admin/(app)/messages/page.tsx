'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alerte,
  Chargement,
  EnTetePage,
  EtatVide,
  Pagination,
} from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, nombre } from '@/lib/format';
import { useAuth } from '@/components/admin/ContexteAuth';
import { InscriptionsMarche } from './InscriptionsMarche';
import { MessagesAgents } from './MessagesAgents';
import { ModaleCandidature } from './ModaleCandidature';
import type {
  Benevole,
  MessageContact,
  Paginated,
  StatutCandidature,
} from '@/lib/types';

const LIBELLES_CANDIDATURE: Record<StatutCandidature, string> = {
  en_attente: 'En attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
};

const VIDE_MESSAGES: Paginated<MessageContact> = {
  items: [], total: 0, page: 1, limit: 20, pages: 1,
};
const VIDE_BENEVOLES: Paginated<Benevole> = {
  items: [], total: 0, page: 1, limit: 20, pages: 1,
};

type Onglet = 'messages' | 'benevoles' | 'marche';

/** Messages de contact et candidatures de bénévoles (US-PUB-06, US-PUB-07). */
export default function PageMessages() {
  const [onglet, setOnglet] = useState<Onglet>('messages');
  const [messages, setMessages] = useState<Paginated<MessageContact>>(VIDE_MESSAGES);
  const [benevoles, setBenevoles] = useState<Paginated<Benevole>>(VIDE_BENEVOLES);
  const [candidature, setCandidature] = useState<Benevole | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const { peut } = useAuth();
  const [page, setPage] = useState(1);
  const [masquerTraites, setMasquerTraites] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const params = {
        page,
        limit: 20,
        traite: masquerTraites ? 'false' : undefined,
      };
      /*
       * L'onglet de la marche charge ses propres données : inutile
       * d'interroger les candidatures qu'il n'affichera pas.
       */
      if (onglet === 'messages') {
        setMessages(await apiAdmin<Paginated<MessageContact>>('/contact', { params }));
      } else if (onglet === 'benevoles') {
        setBenevoles(await apiAdmin<Paginated<Benevole>>('/benevoles', { params }));
      }
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [onglet, page, masquerTraites]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function basculerTraite(
    type: Onglet,
    id: number,
    traite: boolean,
  ): Promise<void> {
    try {
      await apiAdmin(`${type === 'messages' ? '/contact' : '/benevoles'}/${id}`, {
        method: 'PATCH',
        body: { traite },
      });
      await charger();
    } catch {
      setErreur('Mise à jour impossible.');
    }
  }

  const courant = onglet === 'messages' ? messages : benevoles;

  /*
   * Un compte en lecture voit une autre page derrière la même adresse : les
   * éloges et rappels de son équipe, et non les messages du public ni les
   * candidatures, qui ne le concernent pas.
   */
  if (!peut('super_admin', 'admin')) {
    return <MessagesAgents />;
  }

  return (
    <>
      <EnTetePage
        titre="Messages"
        complement={
          onglet === 'marche'
            ? 'Inscriptions à la marche'
            : `${nombre(courant.total)} ${onglet === 'messages' ? 'messages' : 'candidatures'}`
        }
      />

      <div className="space-y-4 p-6">
        {confirmation && (
          <Alerte type="succes" onFermer={() => setConfirmation('')}>
            {confirmation}
          </Alerte>
        )}
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['messages', 'Formulaire de contact'],
              ['benevoles', 'Candidatures bénévoles'],
              ['marche', 'Marche Sucre à terre'],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              onClick={() => {
                setOnglet(valeur);
                setPage(1);
              }}
              aria-pressed={onglet === valeur}
              className={`puce-filtre ${onglet === valeur ? 'puce-filtre-active' : ''}`}
            >
              {libelle}
            </button>
          ))}
        </div>

        {onglet === 'marche' ? (
          <InscriptionsMarche onErreur={setErreur} />
        ) : (
        <div className="admin-panneau">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-trait p-4">

            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={masquerTraites}
                onChange={(e) => {
                  setMasquerTraites(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 accent-admin-encre"
              />
              Masquer les éléments traités
            </label>
          </div>

          {chargement ? (
            <Chargement />
          ) : courant.items.length === 0 ? (
            <EtatVide
              message={
                onglet === 'messages'
                  ? 'Aucun message reçu.'
                  : 'Aucune candidature de bénévole.'
              }
            />
          ) : onglet === 'messages' ? (
            <ul className="divide-y divide-admin-trait">
              {messages.items.map((message) => (
                <li key={message.id} className={message.traite ? 'opacity-60' : ''}>
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold">{message.nom}</span>
                        <a
                          href={`mailto:${message.email}`}
                          className="font-mono text-[0.8125rem] text-admin-vert hover:underline"
                        >
                          {message.email}
                        </a>
                        <span className="font-mono text-[0.75rem] text-admin-gris">
                          {dateHeure(message.created_at)}
                        </span>
                      </p>
                      {message.sujet && (
                        <p className="mt-2 text-sm font-bold">{message.sujet}</p>
                      )}
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-admin-encre">
                        {message.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void basculerTraite('messages', message.id, !message.traite)
                      }
                      className={message.traite ? 'admin-bouton-clair' : 'admin-bouton'}
                    >
                      {message.traite ? 'Rouvrir' : 'Marquer traité'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Nom</th>
                    <th className="admin-th">Contact</th>
                    <th className="admin-th">Ville</th>
                    <th className="admin-th">Disponibilité</th>
                    <th className="admin-th">Reçue le</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {benevoles.items.map((benevole) => (
                    <tr
                      key={benevole.id}
                      className={`transition-colors duration-150 hover:bg-admin-fond ${benevole.traite ? 'opacity-60' : ''}`}
                    >
                      <td className="admin-td font-bold">
                        {benevole.prenom} {benevole.nom}
                      </td>
                      <td className="admin-td">
                        <a
                          href={`mailto:${benevole.email}`}
                          className="block font-mono text-[0.8125rem] text-admin-vert hover:underline"
                        >
                          {benevole.email}
                        </a>
                        {benevole.telephone && (
                          <span className="font-mono text-[0.75rem] text-admin-gris">
                            {benevole.telephone}
                          </span>
                        )}
                      </td>
                      <td className="admin-td">{benevole.ville ?? '—'}</td>
                      <td className="admin-td">{benevole.disponibilite ?? '—'}</td>
                      <td className="admin-td font-mono text-[0.8125rem]">
                        {dateHeure(benevole.created_at)}
                      </td>
                      <td className="admin-td">
                        <span
                          className={`pastille ${
                            benevole.statut === 'accepte'
                              ? 'pastille-normal'
                              : benevole.statut === 'refuse'
                                ? 'pastille-neutre'
                                : 'pastille-attention'
                          }`}
                        >
                          {LIBELLES_CANDIDATURE[benevole.statut]}
                        </span>
                        {benevole.reponse && (
                          <span className="ml-2 text-[0.75rem] text-admin-gris">
                            répondu
                          </span>
                        )}
                      </td>
                      <td className="admin-td text-right">
                        <button
                          type="button"
                          onClick={() => setCandidature(benevole)}
                          className="text-[0.8125rem] font-medium text-admin-vert hover:underline"
                        >
                          Traiter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={courant.page}
            pages={courant.pages}
            total={courant.total}
            limite={courant.limit}
            onPage={setPage}
          />
        </div>
        )}
      </div>

      {candidature && (
        <ModaleCandidature
          candidature={candidature}
          onFermer={() => setCandidature(null)}
          onChangement={(texte) => {
            setConfirmation(texte);
            void charger();
          }}
        />
      )}
    </>
  );
}
