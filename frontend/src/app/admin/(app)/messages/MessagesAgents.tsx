'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement, EnTetePage, EtatVide } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure } from '@/lib/format';
import type { MessageAgent, TypeMessageAgent } from '@/lib/types';

const FILTRES: Array<{ valeur: TypeMessageAgent | 'tous'; libelle: string }> = [
  { valeur: 'tous', libelle: 'Tout' },
  { valeur: 'eloge', libelle: 'Éloges' },
  { valeur: 'rappel', libelle: 'Rappels' },
];

/**
 * Éloges et rappels, vus par un agent.
 *
 * Il voit ceux de toute l'équipe et pas seulement les siens : une
 * reconnaissance adressée à une commune concerne tous ceux qui y ont
 * travaillé, et un rappel collectif perdrait son sens s'il n'était visible
 * que par un seul.
 *
 * Aucune action : cette page se lit.
 */
export function MessagesAgents() {
  const [messages, setMessages] = useState<MessageAgent[]>([]);
  const [type, setType] = useState<TypeMessageAgent | 'tous'>('tous');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setMessages(
        await apiAdmin<MessageAgent[]>('/agents/messages', {
          params: { type: type === 'tous' ? undefined : type },
        }),
      );
      setErreur('');
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.');
    } finally {
      setChargement(false);
    }
  }, [type]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <>
      <EnTetePage
        titre="Messages de l’équipe"
        complement={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`}
      />

      <div className="space-y-4 p-6">
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}

        <div className="admin-panneau">
          <div className="flex flex-wrap gap-1.5 border-b border-admin-trait p-4">
            {FILTRES.map((filtre) => (
              <button
                key={filtre.valeur}
                type="button"
                onClick={() => setType(filtre.valeur)}
                aria-pressed={type === filtre.valeur}
                className={`puce-filtre ${type === filtre.valeur ? 'puce-filtre-active' : ''}`}
              >
                {filtre.libelle}
              </button>
            ))}
          </div>

          {chargement ? (
            <Chargement />
          ) : messages.length === 0 ? (
            <EtatVide
              message={
                type === 'rappel'
                  ? 'Aucun rappel. C’est une bonne nouvelle.'
                  : 'Aucun message pour l’instant.'
              }
            />
          ) : (
            <ul className="divide-y divide-admin-trait">
              {messages.map((message) => (
                <li key={message.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`pastille ${
                        message.type === 'rappel'
                          ? 'pastille-attention'
                          : 'pastille-normal'
                      }`}
                    >
                      {message.type === 'rappel' ? 'Rappel' : 'Éloge'}
                    </span>
                    <span className="text-sm font-bold">
                      {message.agent
                        ? `${message.agent.prenom} ${message.agent.nom}`
                        : (message.commune?.nom
                            ? `Équipe de ${message.commune.nom}`
                            : 'Destinataire retiré')}
                    </span>
                    <span className="font-mono text-[0.75rem] text-admin-gris">
                      {dateHeure(message.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{message.message}</p>
                  {message.auteur && (
                    <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                      par {message.auteur.prenom} {message.auteur.nom}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
