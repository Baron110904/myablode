'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

type Etat = 'chargement' | 'succes' | 'erreur';

export function Desinscription({ token }: { token: string }) {
  const t = useTranslations('newsletter');
  const tc = useTranslations('commun');
  const [etat, setEtat] = useState<Etat>('chargement');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setMessage(t('desinscritErreur'));
      setEtat('erreur');
      return;
    }

    let annule = false;

    void (async () => {
      try {
        const reponse = await fetch(`${API_URL}/api/newsletter/desinscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (annule) return;

        const corps = await reponse.json().catch(() => ({}));
        if (!reponse.ok) {
          setMessage(corps.message ?? t('desinscritErreur'));
          setEtat('erreur');
          return;
        }
        setMessage(corps.message ?? t('desinscritSucces'));
        setEtat('succes');
      } catch {
        if (!annule) {
          setMessage(tc('erreur'));
          setEtat('erreur');
        }
      }
    })();

    return () => {
      annule = true;
    };
  }, [token, t, tc]);

  return (
    <div className="conteneur py-20">
      <div className="mx-auto max-w-lg border border-ablode-trait bg-white p-10 text-center">
        <p className="font-mono text-etiquette uppercase text-ablode-gris">
          {t('desinscription')}
        </p>

        {etat === 'chargement' && (
          <p className="mt-6 animate-pulsation text-[1.0625rem]">{tc('chargement')}</p>
        )}

        {etat === 'succes' && (
          <>
            <p className="mt-6 text-2xl font-bold leading-snug">✓</p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed">{message}</p>
          </>
        )}

        {etat === 'erreur' && (
          <p className="mt-6 text-[1.0625rem] leading-relaxed text-ablode-alerte">
            {message}
          </p>
        )}

        <Link href="/" className="bouton-secondaire mt-9">
          Retour au site
        </Link>
      </div>
    </div>
  );
}
