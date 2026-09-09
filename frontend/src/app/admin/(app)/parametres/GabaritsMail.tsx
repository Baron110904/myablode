'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement, Panneau } from '@/components/admin/Elements';
import { EditeurTexte } from '@/components/admin/EditeurTexte';
import { apiAdmin, ApiError } from '@/lib/api';
import type { GabaritMail } from '@/lib/types';

/**
 * Réglage des messages envoyés par la plateforme.
 *
 * Cet écran ne faisait que lister les courriels ; ils étaient figés dans le
 * code. Objet et corps sont désormais modifiables, avec retour au texte
 * d'origine à tout moment — c'est ce qui permet d'essayer une formulation
 * sans craindre de perdre celle qui marchait.
 */
export function GabaritsMail() {
  const [gabarits, setGabarits] = useState<GabaritMail[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setGabarits(await apiAdmin<GabaritMail[]>('/mail/gabarits'));
      setErreur('');
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <Panneau titre="Messages envoyés par la plateforme">
      {erreur && (
        <div className="mb-4">
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        </div>
      )}
      {message && (
        <div className="mb-4">
          <Alerte type="succes" onFermer={() => setMessage('')}>
            {message}
          </Alerte>
        </div>
      )}

      {chargement ? (
        <Chargement />
      ) : (
        <ul className="divide-y divide-admin-trait">
          {gabarits.map((gabarit) => (
            <li key={gabarit.cle} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    {gabarit.libelle}
                    {gabarit.personnalise && (
                      <span className="pastille pastille-normal">Personnalisé</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-admin-gris">
                    {gabarit.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOuvert(ouvert === gabarit.cle ? null : gabarit.cle)
                  }
                  className="admin-bouton-clair shrink-0"
                >
                  {ouvert === gabarit.cle ? 'Fermer' : 'Modifier'}
                </button>
              </div>

              {ouvert === gabarit.cle && (
                <FormulaireGabarit
                  gabarit={gabarit}
                  onEnregistre={(texte) => {
                    setMessage(texte);
                    setOuvert(null);
                    void charger();
                  }}
                  onErreur={setErreur}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panneau>
  );
}

function FormulaireGabarit({
  gabarit,
  onEnregistre,
  onErreur,
}: {
  gabarit: GabaritMail;
  onEnregistre: (message: string) => void;
  onErreur: (message: string) => void;
}) {
  const [sujet, setSujet] = useState(gabarit.sujet);
  const [corps, setCorps] = useState(gabarit.corps);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer(retablir = false) {
    setEnvoi(true);
    try {
      await apiAdmin(`/mail/gabarits/${gabarit.cle}`, {
        method: 'PUT',
        body: retablir ? { sujet: '', corps: '' } : { sujet, corps },
      });
      onEnregistre(
        retablir
          ? `« ${gabarit.libelle} » est revenu au texte d’origine.`
          : `« ${gabarit.libelle} » enregistré.`,
      );
    } catch (attrapee) {
      onErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mt-4 rounded-carte bg-admin-fond p-5">
      <div>
        <label htmlFor={`sujet-${gabarit.cle}`} className="etiquette mb-2 block">
          Objet
        </label>
        <input
          id={`sujet-${gabarit.cle}`}
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          maxLength={200}
          className="admin-champ"
        />
      </div>

      <div className="mt-5">
        <span className="etiquette mb-2 block">Corps du message</span>
        <EditeurTexte
          valeur={corps}
          onChange={setCorps}
          hauteur="min-h-[180px]"
          placeholder="Écrivez le message…"
        />
      </div>

      {gabarit.variables.length > 0 && (
        <div className="mt-4">
          <p className="etiquette mb-2">Variables disponibles</p>
          <ul className="space-y-1.5">
            {gabarit.variables.map((variable) => (
              <li key={variable.nom} className="text-[0.8125rem] leading-relaxed">
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.75rem]">
                  {`{{${variable.nom}}}`}
                </code>{' '}
                <span className="text-admin-gris">{variable.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
            Écrivez-les entre doubles accolades. Une variable oubliée reste
            visible telle quelle dans le message reçu.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {gabarit.personnalise && (
          <button
            type="button"
            disabled={envoi}
            onClick={() => void enregistrer(true)}
            className="admin-bouton-clair"
          >
            Rétablir le texte d’origine
          </button>
        )}
        <button
          type="button"
          disabled={envoi || !sujet.trim() || !corps.trim()}
          onClick={() => void enregistrer()}
          className="admin-bouton"
        >
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
