'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/public/Logo';
import { Alerte } from '@/components/admin/Elements';
import { API_URL } from '@/lib/api';

export default function PageMotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur('');

    try {
      const reponse = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const corps = await reponse.json().catch(() => ({}));

      if (!reponse.ok) {
        setErreur(corps.message ?? 'Demande impossible.');
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
          Mot de passe oublié
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-admin-gris">
          Indiquez l’adresse email de votre compte. Si elle est enregistrée, vous
          recevrez un lien pour définir un nouveau mot de passe.
        </p>

        {message ? (
          <div className="mt-8 space-y-6">
            <Alerte type="succes">{message}</Alerte>
            <Link href="/admin/login" className="admin-bouton-clair">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={soumettre} className="mt-8 space-y-5">
            {erreur && <Alerte type="erreur">{erreur}</Alerte>}

            <div>
              <label htmlFor="email" className="etiquette mb-2 block">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="admin-champ py-3"
              />
            </div>

            <button type="submit" disabled={envoi} className="admin-bouton w-full py-3.5">
              {envoi ? 'Envoi…' : 'Envoyer le lien'}
            </button>

            <Link
              href="/admin/login"
              className="block text-center text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
            >
              ← Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
