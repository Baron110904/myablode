'use client';

import { useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure } from '@/lib/format';
import type { Benevole } from '@/lib/types';

interface Identifiants {
  email: string;
  motDePasse: string;
}

/**
 * Traitement d'une candidature de bénévole : répondre, accepter, refuser.
 *
 * L'acceptation crée la fiche agent et le compte de consultation. Les
 * identifiants sont affichés **une seule fois**, ici : ils ne partent pas
 * par courriel et ne sont pas récupérables ensuite. Le mot de passe n'est
 * stocké que sous forme de condensat.
 */
export function ModaleCandidature({
  candidature,
  onFermer,
  onChangement,
}: {
  candidature: Benevole;
  onFermer: () => void;
  onChangement: (message: string) => void;
}) {
  const [reponse, setReponse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState<'reponse' | 'accepter' | 'refuser' | null>(null);
  const [identifiants, setIdentifiants] = useState<Identifiants | null>(null);

  const nomComplet = `${candidature.prenom} ${candidature.nom}`;

  async function agir(
    action: 'reponse' | 'accepter' | 'refuser',
    corps: Record<string, unknown>,
  ) {
    setEnvoi(action);
    setErreur('');
    try {
      const chemin =
        action === 'reponse'
          ? `/benevoles/${candidature.id}/reponse`
          : `/benevoles/${candidature.id}/${action}`;

      const resultat = await apiAdmin<{
        identifiants?: Identifiants;
      }>(chemin, { method: 'POST', body: corps });

      if (action === 'accepter') {
        /*
         * La modale reste ouverte pour afficher les identifiants : les fermer
         * automatiquement les perdrait définitivement.
         */
        setIdentifiants(resultat.identifiants ?? null);
        onChangement(`${nomComplet} est accepté et ajouté aux agents de terrain.`);
        if (!resultat.identifiants) onFermer();
        return;
      }

      onChangement(
        action === 'refuser'
          ? `Candidature de ${nomComplet} refusée.`
          : `Réponse envoyée à ${nomComplet}.`,
      );
      onFermer();
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Action impossible.');
    } finally {
      setEnvoi(null);
    }
  }

  /* ─── Identifiants créés : écran dédié, on ne montre rien d'autre ───── */
  if (identifiants) {
    return (
      <Modale titre="Accès créés" onFermer={onFermer}>
        <Alerte type="attention">
          Notez ces identifiants maintenant. Ils ne sont pas envoyés par
          courriel et ne pourront plus être affichés — seul un nouveau mot de
          passe pourra être généré depuis la page Utilisateurs.
        </Alerte>

        <dl className="mt-5 divide-y divide-admin-trait border-y border-admin-trait">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="etiquette">Adresse</dt>
            <dd className="font-mono text-sm font-bold">{identifiants.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="etiquette">Mot de passe</dt>
            <dd className="select-all font-mono text-base font-bold tracking-wide">
              {identifiants.motDePasse}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-[0.8125rem] leading-relaxed text-admin-gris">
          À remettre à {nomComplet} lorsqu’il se présentera pour sa première
          participation. Le compte donne un accès en lecture seule.
        </p>

        <div className="mt-7 flex justify-end">
          <button type="button" onClick={onFermer} className="admin-bouton">
            J’ai noté
          </button>
        </div>
      </Modale>
    );
  }

  return (
    <Modale
      titre={nomComplet}
      sousTitre={`Candidature reçue le ${dateHeure(candidature.created_at)}`}
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

      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {[
          ['Courriel', candidature.email],
          ['Téléphone', candidature.telephone ?? '—'],
          ['Ville', candidature.ville ?? '—'],
          ['Disponibilité', candidature.disponibilite ?? '—'],
        ].map(([libelle, valeur]) => (
          <div key={libelle}>
            <dt className="etiquette">{libelle}</dt>
            <dd className="mt-1 text-sm">{valeur}</dd>
          </div>
        ))}
      </dl>

      {candidature.message && (
        <section className="mt-6">
          <h3 className="etiquette mb-2">Message du candidat</h3>
          <p className="whitespace-pre-line rounded-carte bg-admin-fond p-4 text-sm leading-relaxed">
            {candidature.message}
          </p>
        </section>
      )}

      {candidature.reponse && (
        <section className="mt-6">
          <h3 className="etiquette mb-2">
            Réponse déjà envoyée
            {candidature.repondu_le && ` · ${dateHeure(candidature.repondu_le)}`}
          </h3>
          <p className="whitespace-pre-line rounded-carte border border-admin-trait p-4 text-sm leading-relaxed">
            {candidature.reponse}
          </p>
        </section>
      )}

      <section className="mt-6">
        <label htmlFor="reponse" className="etiquette mb-2 block">
          Votre réponse
        </label>
        <textarea
          id="reponse"
          rows={4}
          maxLength={4000}
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          placeholder="Bonjour, merci pour votre candidature…"
          className="admin-champ-multiligne"
        />
        <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
          Envoyée par courriel et conservée sur la fiche. Facultative si vous
          acceptez : un courriel de bienvenue part dans tous les cas.
        </p>
      </section>

      <div className="mt-7 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onFermer} className="admin-bouton-clair">
          Fermer
        </button>
        <button
          type="button"
          disabled={envoi !== null || reponse.trim().length < 3}
          onClick={() => void agir('reponse', { reponse: reponse.trim() })}
          className="admin-bouton-clair"
        >
          {envoi === 'reponse' ? 'Envoi…' : 'Répondre seulement'}
        </button>
        <button
          type="button"
          disabled={envoi !== null || candidature.statut === 'refuse'}
          onClick={() =>
            void agir('refuser', reponse.trim() ? { reponse: reponse.trim() } : {})
          }
          className="admin-bouton-clair"
        >
          {envoi === 'refuser' ? '…' : 'Refuser'}
        </button>
        <button
          type="button"
          disabled={envoi !== null || candidature.statut === 'accepte'}
          onClick={() =>
            void agir('accepter', reponse.trim() ? { reponse: reponse.trim() } : {})
          }
          className="admin-bouton"
        >
          {envoi === 'accepter' ? 'Création…' : 'Accepter'}
        </button>
      </div>
    </Modale>
  );
}
