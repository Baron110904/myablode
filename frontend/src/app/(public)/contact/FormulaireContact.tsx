'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChampFormulaire } from '@/components/public/ChampFormulaire';
import { API_URL } from '@/lib/api';

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur';

export function FormulaireContact() {
  const t = useTranslations('contact');
  const tc = useTranslations('commun');

  const [valeurs, setValeurs] = useState({
    nom: '',
    email: '',
    sujet: '',
    message: '',
  });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<Etat>('repos');
  const [messageServeur, setMessageServeur] = useState('');

  const maj = (champ: keyof typeof valeurs) => (valeur: string) => {
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));
    setErreurs((courant) => {
      const { [champ]: _, ...reste } = courant;
      return reste;
    });
  };

  function valider(): boolean {
    const trouvees: Record<string, string> = {};
    if (!valeurs.nom.trim()) trouvees.nom = tc('champObligatoire');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email)) {
      trouvees.email = tc('emailInvalide');
    }
    if (valeurs.message.trim().length < 10) {
      trouvees.message = 'Votre message doit contenir au moins 10 caractères.';
    }
    setErreurs(trouvees);
    return Object.keys(trouvees).length === 0;
  }

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (!valider() || etat === 'envoi') return;

    setEtat('envoi');
    try {
      const reponse = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: valeurs.nom,
          email: valeurs.email,
          sujet: valeurs.sujet || undefined,
          message: valeurs.message,
        }),
      });

      const corps = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        setMessageServeur(corps.message ?? tc('erreur'));
        setEtat('erreur');
        return;
      }

      setMessageServeur(corps.message ?? t('succes'));
      setEtat('succes');
    } catch {
      setMessageServeur(tc('erreur'));
      setEtat('erreur');
    }
  }

  if (etat === 'succes') {
    return (
      <div
        role="status"
        className="flex flex-col items-start justify-center border border-ablode-trait bg-white p-9"
      >
        <span className="font-mono text-etiquette uppercase text-ablode-vert">✓ Envoyé</span>
        <p className="mt-4 text-[1.0625rem] leading-relaxed">{messageServeur}</p>
        <button
          type="button"
          onClick={() => {
            setValeurs({ nom: '', email: '', sujet: '', message: '' });
            setEtat('repos');
          }}
          className="mt-7 puce-filtre"
        >
          Écrire un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} noValidate className="border border-ablode-trait bg-white p-8">
      <div className="space-y-6">
        <ChampFormulaire
          id="nom"
          libelle={t('nom')}
          valeur={valeurs.nom}
          onChange={maj('nom')}
          obligatoire
          erreur={erreurs.nom}
          autoComplete="name"
        />
        <ChampFormulaire
          id="email"
          type="email"
          libelle={t('email')}
          valeur={valeurs.email}
          onChange={maj('email')}
          obligatoire
          erreur={erreurs.email}
          autoComplete="email"
        />
        <ChampFormulaire
          id="sujet"
          libelle={t('sujet')}
          valeur={valeurs.sujet}
          onChange={maj('sujet')}
        />
        <ChampFormulaire
          id="message"
          libelle={t('message')}
          valeur={valeurs.message}
          onChange={maj('message')}
          obligatoire
          erreur={erreurs.message}
          lignes={6}
        />
      </div>

      {etat === 'erreur' && (
        <p role="alert" className="mt-5 border-l-2 border-ablode-alerte bg-ablode-alerte-voile px-4 py-3 text-sm text-ablode-alerte">
          {messageServeur}
        </p>
      )}

      <button type="submit" disabled={etat === 'envoi'} className="bouton-principal mt-7 w-full sm:w-auto">
        {etat === 'envoi' ? t('envoi') : t('envoyer')}
      </button>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-ablode-gris">
        Les informations transmises servent uniquement à traiter votre demande. Elles ne
        sont ni revendues ni utilisées à des fins publicitaires.
      </p>
    </form>
  );
}
