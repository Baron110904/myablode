'use client';

import { useState } from 'react';
import { Alerte, Panneau } from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, LIBELLES_ROLE } from '@/lib/format';

/** Sécurité du compte connecté : mot de passe et double authentification. */
export function OngletSecurite() {
  const { utilisateur, rafraichirProfil } = useAuth();

  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [messageMdp, setMessageMdp] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');
  const [envoiMdp, setEnvoiMdp] = useState(false);

  const [setup2fa, setSetup2fa] = useState<{ secret: string; otpauthUrl: string } | null>(
    null,
  );
  const [code2fa, setCode2fa] = useState('');
  const [message2fa, setMessage2fa] = useState('');
  const [erreur2fa, setErreur2fa] = useState('');

  async function changerMotDePasse(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreurMdp('');
    setMessageMdp('');

    if (nouveau !== confirmation) {
      setErreurMdp('Les deux saisies du nouveau mot de passe ne correspondent pas.');
      return;
    }

    setEnvoiMdp(true);
    try {
      const reponse = await apiAdmin<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: actuel, newPassword: nouveau },
      });
      setMessageMdp(reponse.message);
      setActuel('');
      setNouveau('');
      setConfirmation('');
    } catch (erreurAttrapee) {
      setErreurMdp(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Modification impossible.',
      );
    } finally {
      setEnvoiMdp(false);
    }
  }

  async function preparer2fa() {
    setErreur2fa('');
    try {
      setSetup2fa(
        await apiAdmin<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', {
          method: 'POST',
        }),
      );
    } catch (erreurAttrapee) {
      setErreur2fa(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Activation impossible.',
      );
    }
  }

  async function activer2fa() {
    setErreur2fa('');
    try {
      const reponse = await apiAdmin<{ message: string }>('/auth/2fa/enable', {
        method: 'POST',
        body: { code: code2fa },
      });
      setMessage2fa(reponse.message);
      setSetup2fa(null);
      setCode2fa('');
      await rafraichirProfil();
    } catch (erreurAttrapee) {
      setErreur2fa(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Code invalide.',
      );
    }
  }

  async function desactiver2fa() {
    setErreur2fa('');
    try {
      const reponse = await apiAdmin<{ message: string }>('/auth/2fa/disable', {
        method: 'POST',
      });
      setMessage2fa(reponse.message);
      await rafraichirProfil();
    } catch (erreurAttrapee) {
      setErreur2fa(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Désactivation impossible.',
      );
    }
  }

  return (
    <div className="space-y-5">
      <Panneau titre="Mon compte">
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="etiquette">Nom</dt>
            <dd className="mt-2 text-sm font-bold">
              {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="etiquette">Rôle</dt>
            <dd className="mt-2 text-sm">
              {utilisateur ? LIBELLES_ROLE[utilisateur.role] : '—'}
            </dd>
          </div>
          <div>
            <dt className="etiquette">Dernière connexion</dt>
            <dd className="mt-2 font-mono text-[0.8125rem]">
              {utilisateur?.last_login ? dateHeure(utilisateur.last_login) : '—'}
            </dd>
          </div>
        </dl>
      </Panneau>

      <Panneau titre="Changer de mot de passe">
        <form onSubmit={changerMotDePasse} className="max-w-md space-y-5">
          {erreurMdp && <Alerte type="erreur">{erreurMdp}</Alerte>}
          {messageMdp && <Alerte type="succes">{messageMdp}</Alerte>}

          <div>
            <label htmlFor="actuel" className="etiquette mb-2 block">
              Mot de passe actuel
            </label>
            <input
              id="actuel"
              type="password"
              required
              autoComplete="current-password"
              value={actuel}
              onChange={(e) => setActuel(e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="nouveau" className="etiquette mb-2 block">
              Nouveau mot de passe
            </label>
            <input
              id="nouveau"
              type="password"
              required
              autoComplete="new-password"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              className="admin-champ"
            />
            <p className="mt-1.5 text-[0.75rem] text-admin-gris">
              8 caractères minimum, avec une minuscule, une majuscule et un chiffre.
            </p>
          </div>

          <div>
            <label htmlFor="confirmation" className="etiquette mb-2 block">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmation"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="admin-champ"
            />
          </div>

          <button type="submit" disabled={envoiMdp} className="admin-bouton">
            {envoiMdp ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </form>
      </Panneau>

      <Panneau titre="Double authentification (2FA)">
        <div className="max-w-2xl space-y-5">
          {erreur2fa && <Alerte type="erreur">{erreur2fa}</Alerte>}
          {message2fa && <Alerte type="succes">{message2fa}</Alerte>}

          <p className="text-sm leading-relaxed text-admin-gris">
            La double authentification ajoute un code temporaire à la connexion, généré
            par une application comme Google Authenticator, Aegis ou FreeOTP.
          </p>

          {utilisateur?.twofa_enabled ? (
            <>
              <Alerte type="succes">
                La double authentification est <strong>active</strong> sur votre compte.
              </Alerte>
              <button
                type="button"
                onClick={() => void desactiver2fa()}
                className="admin-bouton-clair"
              >
                Désactiver la 2FA
              </button>
            </>
          ) : setup2fa ? (
            <div className="space-y-5">
              <div>
                <p className="etiquette mb-2">
                  1 · Ajoutez ce compte dans votre application
                </p>
                <p className="select-all break-all border border-admin-trait bg-admin-fond px-4 py-3 font-mono text-[0.8125rem]">
                  {setup2fa.otpauthUrl}
                </p>
                <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
                  Saisie manuelle possible avec la clé :{' '}
                  <span className="select-all font-mono">{setup2fa.secret}</span>
                </p>
              </div>

              <div>
                <label htmlFor="code2fa" className="etiquette mb-2 block">
                  2 · Saisissez le code affiché
                </label>
                <input
                  id="code2fa"
                  inputMode="numeric"
                  maxLength={6}
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, ''))}
                  className="admin-champ max-w-[180px] font-mono tracking-[0.3em]"
                  placeholder="000000"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void activer2fa()}
                  disabled={code2fa.length < 6}
                  className="admin-bouton"
                >
                  Activer
                </button>
                <button
                  type="button"
                  onClick={() => setSetup2fa(null)}
                  className="admin-bouton-clair"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void preparer2fa()}
              className="admin-bouton"
            >
              Activer la double authentification
            </button>
          )}
        </div>
      </Panneau>
    </div>
  );
}
