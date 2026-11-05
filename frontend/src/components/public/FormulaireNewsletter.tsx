'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { API_URL } from '@/lib/api';

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur';

/**
 * Bloc d'inscription à la newsletter (US-PUB-05).
 *
 * `sombre` habille le champ pour les fonds saturés — le bloc vert de
 * l'accueil et des actualités : pilule blanche, bouton plein à l'intérieur,
 * comme sur les maquettes. `clair` sert en pied d'article, sur fond papier.
 */
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
        className={`animate-apparition text-etiquette uppercase ${
          sombre ? 'text-white' : 'text-ablode-vert'
        }`}
      >
        ✓ {message}
      </p>
    );
  }

  return (
    // Bornée en largeur : sur un grand écran, la pilule s'étirait sur toute
    // la moitié droite du bloc et le champ devenait démesuré.
    <form onSubmit={soumettre} className="w-full lg:max-w-[28rem]">
      <label htmlFor="newsletter-email" className="sr-only">
        {t('placeholder')}
      </label>

      {sombre ? (
        /*
          Champ et bouton dans une même pilule blanche. Le groupe porte
          l'anneau de focus à la place du champ : un halo autour du seul
          `input` se verrait découpé par la pilule qui l'entoure.
        */
        /*
          Dès `sm`, champ et bouton partagent une même pilule blanche. En
          dessous, ils se séparent en deux pilules superposées : empilés dans
          une seule boîte, le fond blanc dessinait un rectangle à coins
          arrondis autour d'un bouton parfaitement ovale, et les deux
          contours ne se répondaient plus. Chacun porte donc sa propre forme.
        */
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:p-1.5 sm:focus-within:ring-2 sm:focus-within:ring-white/60">
          {/*
            `flex-1` plutôt qu'une largeur fixe : le champ occupe toute la
            place restante et pousse le bouton contre le bord droit de la
            pilule. Avec une largeur figée, le bouton se posait à la suite du
            champ et flottait au milieu dès que le bloc s'élargissait.
          */}
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholder')}
            disabled={etat === 'envoi'}
            className="w-full min-w-0 rounded-full bg-white px-5 py-3 text-[0.95rem] text-ablode-encre placeholder:text-ablode-gris focus:outline-none focus:ring-2 focus:ring-white/60 sm:flex-1 sm:bg-transparent sm:py-2.5 sm:focus:ring-0"
          />
          <button
            type="submit"
            disabled={etat === 'envoi'}
            className="w-full shrink-0 rounded-full bg-ablode-nuit px-7 py-3 text-[0.9375rem] font-semibold text-white transition-all duration-200 hover:bg-ablode-encre active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100 sm:w-auto sm:py-2.5"
          >
            {etat === 'envoi' ? '…' : t('inscrire')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholder')}
            disabled={etat === 'envoi'}
            className="champ sm:w-72"
          />
          <button type="submit" disabled={etat === 'envoi'} className="bouton-principal">
            {etat === 'envoi' ? '…' : t('inscrire')}
          </button>
        </div>
      )}

      {etat === 'erreur' && (
        <p
          role="alert"
          className={`mt-2.5 text-sm ${sombre ? 'text-white' : 'text-ablode-alerte'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
