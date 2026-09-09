'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/public/Logo';
import { Alerte } from '@/components/admin/Elements';
import { API_URL } from '@/lib/api';

export default function PageReinitialisation() {
  return (
    <Suspense fallback={null}>
      <Formulaire />
    </Suspense>
  );
}

function Formulaire() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur('');

    if (motDePasse !== confirmation) {
      setErreur('Les deux saisies ne correspondent pas.');
      return;
    }

    setEnvoi(true);
    try {
      const reponse = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: motDePasse }),
      });
      const corps = await reponse.json().catch(() => ({}));

      if (!reponse.ok) {
        setErreur(corps.message ?? 'Réinitialisation impossible.');
        return;
      }
      setMessage(corps.message);
    } catch {
      setErreur('Le serveur est injoignable. Réessayez dans quelques instants.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-14">
      <div className="w-full max-w-md">
        <Logo taille={44} href={null} />

        <h1 className="mt-10 text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">
          Nouveau mot de passe
        </h1>

        {!token ? (
          <div className="mt-8 space-y-6">
            <Alerte type="erreur">
              Ce lien est incomplet. Refaites une demande de réinitialisation.
            </Alerte>
            <Link href="/admin/mot-de-passe-oublie" className="admin-bouton-clair">
              Refaire une demande
            </Link>
          </div>
        ) : message ? (
          <div className="mt-8 space-y-6">
            <Alerte type="succes">{message}</Alerte>
            <Link href="/admin/login" className="admin-bouton">
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={soumettre} className="mt-8 space-y-5">
            {erreur && <Alerte type="erreur">{erreur}</Alerte>}

            <div>
              <label htmlFor="motdepasse" className="etiquette mb-2 block">
                Nouveau mot de passe
              </label>
              <input
                id="motdepasse"
                type="password"
                required
                autoComplete="new-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="admin-champ py-3"
              />
              <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                8 caractères minimum, avec une minuscule, une majuscule et un chiffre.
              </p>
            </div>

            <div>
              <label htmlFor="confirmation" className="etiquette mb-2 block">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmation"
                type="password"
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="admin-champ py-3"
              />
            </div>

            <button type="submit" disabled={envoi} className="admin-bouton w-full py-3.5">
              {envoi ? 'Enregistrement…' : 'Définir le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
