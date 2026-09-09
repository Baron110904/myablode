'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChampFormulaire } from '@/components/public/ChampFormulaire';
import { API_URL } from '@/lib/api';

type Etat = 'repos' | 'envoi' | 'succes' | 'erreur';

export function FormulaireBenevole() {
  const t = useTranslations('benevole');
  const tc = useTranslations('commun');

  const [valeurs, setValeurs] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
    disponibilite: '',
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
    if (!valeurs.prenom.trim()) trouvees.prenom = tc('champObligatoire');
    if (!valeurs.nom.trim()) trouvees.nom = tc('champObligatoire');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email)) {
      trouvees.email = tc('emailInvalide');
    }
    setErreurs(trouvees);
    return Object.keys(trouvees).length === 0;
  }

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (!valider() || etat === 'envoi') return;

    setEtat('envoi');
    try {
      const reponse = await fetch(`${API_URL}/api/benevoles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: valeurs.prenom,
          nom: valeurs.nom,
          email: valeurs.email,
          telephone: valeurs.telephone || undefined,
          ville: valeurs.ville || undefined,
          disponibilite: valeurs.disponibilite || undefined,
          message: valeurs.message || undefined,
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
        <span className="font-mono text-etiquette uppercase text-ablode-vert">
          ✓ Candidature reçue
        </span>
        <p className="mt-4 text-[1.0625rem] leading-relaxed">{messageServeur}</p>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} noValidate className="border border-ablode-trait bg-white p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <ChampFormulaire
          id="prenom"
          libelle={t('prenom')}
          valeur={valeurs.prenom}
          onChange={maj('prenom')}
          obligatoire
          erreur={erreurs.prenom}
          autoComplete="given-name"
        />
        <ChampFormulaire
          id="nom"
          libelle={t('nom')}
          valeur={valeurs.nom}
          onChange={maj('nom')}
          obligatoire
          erreur={erreurs.nom}
          autoComplete="family-name"
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
          id="telephone"
          type="tel"
          libelle={t('telephone')}
          valeur={valeurs.telephone}
          onChange={maj('telephone')}
          placeholder="+229 …"
          autoComplete="tel"
        />
        <ChampFormulaire
          id="ville"
          libelle={t('ville')}
          valeur={valeurs.ville}
          onChange={maj('ville')}
          autoComplete="address-level2"
        />
        <ChampFormulaire
          id="disponibilite"
          libelle={t('disponibilite')}
          valeur={valeurs.disponibilite}
          onChange={maj('disponibilite')}
          options={[
            { valeur: 'Semaine', libelle: t('disponibilites.semaine') },
            { valeur: 'Week-end', libelle: t('disponibilites.weekend') },
            { valeur: 'Ponctuelle', libelle: t('disponibilites.ponctuelle') },
            { valeur: 'Temps plein', libelle: t('disponibilites.tempsPlein') },
          ]}
        />
      </div>

      <div className="mt-6">
        <ChampFormulaire
          id="message"
          libelle={t('message')}
          valeur={valeurs.message}
          onChange={maj('message')}
          lignes={4}
        />
      </div>

      {etat === 'erreur' && (
        <p
          role="alert"
          className="mt-5 border-l-2 border-ablode-alerte bg-ablode-alerte-voile px-4 py-3 text-sm text-ablode-alerte"
        >
          {messageServeur}
        </p>
      )}

      <button type="submit" disabled={etat === 'envoi'} className="bouton-principal mt-7 w-full sm:w-auto">
        {etat === 'envoi' ? '…' : t('envoyer')}
      </button>
    </form>
  );
}
