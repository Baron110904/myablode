'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { API_URL } from '@/lib/api';

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur';

/** Bloc d'inscription à la newsletter (US-PUB-05). */
export function FormulaireNewsletter({ variante = 'sombre' }: { variante?: 'sombre' | 'clair' }) {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<Etat>('repos');
  const [message, setMessage] = useState('');

  const sombre = variante === 'sombre';

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (etat === 'envoi') return;

    setEtat('envoi');
    try {
      const reponse = await fetch(`${API_URL}/api/newsletter/inscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        setMessage(corps.message ?? t('erreur'));
        setEtat('erreur');
        return;
      }

      setMessage(t('succes'));
      setEtat('succes');
      setEmail('');
    } catch {
      setMessage(t('erreur'));
      setEtat('erreur');
    }
  }

  if (etat === 'succes') {
    return (
      <p
        role="status"
        className={`font-mono text-etiquette uppercase ${
          sombre ? 'text-ablode-vert-clair' : 'text-ablode-vert'
        }`}
      >
        ✓ {message}
      </p>
    );
  }

  return (
    <form onSubmit={soumettre} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t('placeholder')}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          disabled={etat === 'envoi'}
          className={
            sombre
              ? 'w-full border border-white/25 bg-transparent px-4 py-3 text-[0.95rem] text-white placeholder:text-white/45 focus:border-ablode-vert-clair focus:outline-none sm:w-72'
              : 'champ sm:w-72'
          }
        />
        <button
          type="submit"
          disabled={etat === 'envoi'}
          className={
            sombre
              ? 'bg-ablode-vert-clair px-7 py-3 font-mono text-etiquette uppercase text-ablode-encre transition-opacity hover:opacity-90 disabled:opacity-50'
              : 'bouton-principal'
          }
        >
          {etat === 'envoi' ? '…' : t('inscrire')}
        </button>
      </div>

      {etat === 'erreur' && (
        <p
          role="alert"
          className={`mt-2 text-sm ${sombre ? 'text-red-300' : 'text-ablode-alerte'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
