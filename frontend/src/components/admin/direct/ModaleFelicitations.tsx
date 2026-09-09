'use client';

import { useEffect, useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { nombre, pourcentage } from '@/lib/format';
import type {
  Agent,
  LigneDirect,
  Paginated,
  TypeMessageAgent,
} from '@/lib/types';

/**
 * Envoi de félicitations depuis le suivi en direct.
 *
 * Deux destinataires possibles : l'équipe de la commune, ou un agent nommé qui
 * y est affecté. Les agents proposés sont ceux affectés à cette commune —
 * féliciter quelqu'un qui n'y a pas travaillé n'aurait pas de sens.
 */
export function ModaleFelicitations({
  commune,
  onFermer,
  onEnvoye,
}: {
  commune: LigneDirect;
  onFermer: () => void;
  onEnvoye: () => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [destinataire, setDestinataire] = useState('equipe');
  const [type, setType] = useState<TypeMessageAgent>('eloge');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void apiAdmin<Paginated<Agent>>('/agents', {
      params: { communeId: commune.commune_id, actif: true, limit: 50 },
    })
      .then((resultat) => setAgents(resultat.items))
      .catch(() => undefined);
  }, [commune.commune_id]);

  async function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await apiAdmin('/agents/felicitations', {
        method: 'POST',
        body: {
          agent_id: destinataire === 'equipe' ? undefined : Number(destinataire),
          commune_id: destinataire === 'equipe' ? commune.commune_id : undefined,
          message: message.trim(),
          type,
        },
      });
      onEnvoye();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Envoi impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  /*
   * Le taux n'est proposé que sur un échantillon qui le supporte : féliciter
   * une équipe pour « 100 % de détection » relevés sur un seul dépistage
   * serait absurde, et le message reste dans l'historique.
   */
  const tauxLisible = commune.depistages >= 20;

  const suggestions = (
    type === 'eloge'
      ? [
          commune.arrivees > 0
            ? `${nombre(commune.arrivees)} dépistages arrivés de ${commune.nom} sur la période. Merci pour la régularité.`
            : null,
          tauxLisible
            ? `${commune.nom} tient un taux de détection de ${pourcentage(commune.taux)} sur ${nombre(commune.depistages)} dépistages : le repérage des cas y est solide.`
            : null,
          `Bravo à l’équipe de ${commune.nom} pour la couverture de la zone.`,
        ]
      : [
          commune.arrivees === 0
            ? `Aucun dépistage n’est remonté de ${commune.nom} sur la période. Merci de confirmer que la collecte se poursuit.`
            : null,
          `Merci de vérifier la saisie du poids et de la taille à ${commune.nom} : plusieurs fiches arrivent incomplètes.`,
          `Un point d’étape est attendu sur la couverture de ${commune.nom}.`,
        ]
  ).filter((texte): texte is string => texte !== null);

  return (
    <Modale
      titre={type === 'eloge' ? 'Adresser un éloge' : 'Adresser un rappel'}
      sousTitre={
        tauxLisible
          ? `${commune.nom} · ${nombre(commune.depistages)} dépistages · ${pourcentage(commune.taux)} de détection`
          : `${commune.nom} · ${nombre(commune.depistages)} dépistages`
      }
      onFermer={onFermer}
    >
      <form onSubmit={envoyer}>
        {/*
          Le choix vient en premier : il change la nature du message, donc les
          formulations proposées plus bas.
        */}
        <div className="mb-5">
          <span className="etiquette mb-2 block">Nature du message</span>
          <div className="flex gap-1.5" role="group" aria-label="Nature du message">
            {(
              [
                ['eloge', 'Éloge'],
                ['rappel', 'Rappel'],
              ] as Array<[TypeMessageAgent, string]>
            ).map(([valeur, libelle]) => (
              <button
                key={valeur}
                type="button"
                onClick={() => setType(valeur)}
                aria-pressed={type === valeur}
                className={`puce-filtre ${type === valeur ? 'puce-filtre-active' : ''}`}
              >
                {libelle}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-admin-gris">
            {type === 'eloge'
              ? 'Une reconnaissance, visible par toute l’équipe.'
              : 'Un signalement écrit et daté, visible par toute l’équipe. Il reste dans l’historique.'}
          </p>
        </div>

        {erreur && (
          <div className="mb-5">
            <Alerte type="erreur">{erreur}</Alerte>
          </div>
        )}

        <div>
          <label htmlFor="destinataire" className="etiquette mb-2 block">
            Destinataire
          </label>
          <select
            id="destinataire"
            value={destinataire}
            onChange={(e) => setDestinataire(e.target.value)}
            className="admin-champ"
          >
            <option value="equipe">Toute l’équipe de {commune.nom}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.prenom} {agent.nom}
              </option>
            ))}
          </select>
          {agents.length === 0 && (
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-admin-gris">
              Aucun agent n’est affecté à cette commune. Le message ira à
              l’équipe ; pour viser une personne, affectez-la d’abord depuis la
              page Agents.
            </p>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="message" className="etiquette mb-2 block">
            Message *
          </label>
          <textarea
            id="message"
            required
            rows={3}
            maxLength={280}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ce que vous voulez reconnaître, en une phrase."
            className="admin-champ-multiligne"
          />
          <p className="mt-2 text-right font-mono text-[0.75rem] text-admin-gris">
            {message.length} / 280
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="etiquette mb-2">Reprendre une formulation</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((texte) => (
                <button
                  key={texte}
                  type="button"
                  onClick={() => setMessage(texte)}
                  className="rounded-carte border border-admin-trait px-4 py-2.5 text-left text-[0.8125rem] leading-relaxed transition-colors hover:border-admin-vert hover:bg-admin-fond"
                >
                  {texte}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="admin-bouton-clair">
            Annuler
          </button>
          <button
            type="submit"
            disabled={envoi || message.trim().length < 3}
            className="admin-bouton"
          >
            {envoi ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </Modale>
  );
}
