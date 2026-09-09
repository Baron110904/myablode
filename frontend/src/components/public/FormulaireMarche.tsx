'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChampFormulaire } from './ChampFormulaire';
import { API_URL } from '@/lib/api';
import type { FormulaireMarchePublic } from '@/lib/types';

const VIDE = {
  nom: '',
  prenom: '',
  age: '',
  sexe: '',
  fonction: '',
  ville: '',
  quartier: '',
  email: '',
  telephone: '',
  motivation: '',
};

/**
 * Bulletin d'inscription à la marche « Sucre à terre ».
 *
 * Occupe sa propre page : neuf champs au milieu d'un article coupaient le
 * récit, et le lecteur venu s'informer tombait sur une corvée. L'article
 * porte désormais un bouton, et cette page ne fait qu'une chose.
 */
export function FormulaireMarche({
  formulaire,
  retour,
}: {
  formulaire: FormulaireMarchePublic;
  /** Adresse de l'article d'origine, pour revenir en arrière. */
  retour: string;
}) {
  const [valeurs, setValeurs] = useState(VIDE);
  const [dejaParticipe, setDejaParticipe] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  function verifier(): boolean {
    const trouvees: Record<string, string> = {};
    if (valeurs.nom.trim().length < 2) trouvees.nom = 'Indiquez votre nom.';
    if (valeurs.prenom.trim().length < 2) trouvees.prenom = 'Indiquez votre prénom.';
    const age = Number(valeurs.age);
    if (!Number.isInteger(age) || age < 3 || age > 120) {
      trouvees.age = 'Âge attendu entre 3 et 120 ans.';
    }
    if (valeurs.sexe !== 'M' && valeurs.sexe !== 'F') trouvees.sexe = 'Choisissez F ou M.';
    if (valeurs.fonction.trim().length < 2) trouvees.fonction = 'Indiquez votre fonction.';
    if (valeurs.ville.trim().length < 2) trouvees.ville = 'Indiquez votre ville.';
    if (valeurs.quartier.trim().length < 2) {
      trouvees.quartier = 'Indiquez votre quartier.';
    }
    // Contrôle volontairement large : c'est le serveur qui fait autorité.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeurs.email.trim())) {
      trouvees.email = 'Indiquez une adresse électronique valide.';
    }
    if (valeurs.telephone.replace(/\D/g, '').length < 6) {
      trouvees.telephone = 'Indiquez un numéro de téléphone.';
    }
    setErreurs(trouvees);
    return Object.keys(trouvees).length === 0;
  }

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (envoi || !verifier()) return;

    setEnvoi(true);
    setErreur('');
    try {
      const reponse = await fetch(`${API_URL}/api/marche/inscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulaire_id: formulaire.id,
          nom: valeurs.nom.trim(),
          prenom: valeurs.prenom.trim(),
          age: Number(valeurs.age),
          sexe: valeurs.sexe,
          fonction: valeurs.fonction.trim(),
          ville: valeurs.ville.trim(),
          quartier: valeurs.quartier.trim(),
          email: valeurs.email.trim(),
          telephone: valeurs.telephone.trim(),
          deja_participe: dejaParticipe,
          motivation: valeurs.motivation.trim() || undefined,
        }),
      });

      const corps = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        setErreur(corps.message ?? 'Inscription impossible pour le moment.');
        return;
      }

      setConfirmation(corps.message ?? 'Votre inscription est enregistrée.');
      setValeurs(VIDE);
      setDejaParticipe(false);
    } catch {
      setErreur('Le serveur est injoignable. Réessayez dans un instant.');
    } finally {
      setEnvoi(false);
    }
  }

  if (confirmation) {
    return (
      <div className="mx-auto max-w-lecture py-6 text-center">
        <p className="etiquette">Inscription enregistrée</p>
        <h2 className="titre-section mt-4">{confirmation}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmation('')}
            className="bouton-secondaire"
          >
            Inscrire quelqu’un d’autre
          </button>
          <Link href={retour} className="bouton-principal">
            Revenir à l’article
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} noValidate className="mx-auto max-w-lecture space-y-5">
      {erreur && (
        <p
          role="alert"
          className="rounded-carte border border-ablode-alerte bg-ablode-alerte-voile px-5 py-4 text-sm text-ablode-alerte"
        >
          {erreur}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <ChampFormulaire
          id="marche-prenom"
          libelle="Prénom"
          obligatoire
          valeur={valeurs.prenom}
          onChange={(v) => maj('prenom', v)}
          erreur={erreurs.prenom}
          autoComplete="given-name"
        />
        <ChampFormulaire
          id="marche-nom"
          libelle="Nom"
          obligatoire
          valeur={valeurs.nom}
          onChange={(v) => maj('nom', v)}
          erreur={erreurs.nom}
          autoComplete="family-name"
        />
        <ChampFormulaire
          id="marche-age"
          libelle="Âge"
          type="number"
          obligatoire
          valeur={valeurs.age}
          onChange={(v) => maj('age', v)}
          erreur={erreurs.age}
        />
        <ChampFormulaire
          id="marche-sexe"
          libelle="Sexe"
          obligatoire
          valeur={valeurs.sexe}
          onChange={(v) => maj('sexe', v)}
          erreur={erreurs.sexe}
          options={[
            { valeur: 'F', libelle: 'Féminin' },
            { valeur: 'M', libelle: 'Masculin' },
          ]}
        />
        <ChampFormulaire
          id="marche-fonction"
          libelle="Fonction"
          obligatoire
          valeur={valeurs.fonction}
          onChange={(v) => maj('fonction', v)}
          erreur={erreurs.fonction}
          aide="Élève, infirmier, commerçante…"
        />
        <ChampFormulaire
          id="marche-ville"
          libelle="Ville"
          obligatoire
          valeur={valeurs.ville}
          onChange={(v) => maj('ville', v)}
          erreur={erreurs.ville}
        />
        <div className="sm:col-span-2">
          <ChampFormulaire
            id="marche-quartier"
            libelle="Quartier de provenance"
            obligatoire
            valeur={valeurs.quartier}
            onChange={(v) => maj('quartier', v)}
            erreur={erreurs.quartier}
          />
        </div>
        <ChampFormulaire
          id="marche-telephone"
          libelle="Téléphone"
          type="tel"
          obligatoire
          valeur={valeurs.telephone}
          onChange={(v) => maj('telephone', v)}
          erreur={erreurs.telephone}
          autoComplete="tel"
          aide="Pour vous joindre le jour de la marche."
        />
        <ChampFormulaire
          id="marche-email"
          libelle="Adresse électronique"
          type="email"
          obligatoire
          valeur={valeurs.email}
          onChange={(v) => maj('email', v)}
          erreur={erreurs.email}
          autoComplete="email"
          aide="Vous recevrez la lettre d’information de l’association."
        />
      </div>


      <label className="flex cursor-pointer items-start gap-3 rounded-carte border border-ablode-trait bg-white px-5 py-4">
        <input
          type="checkbox"
          checked={dejaParticipe}
          onChange={(e) => setDejaParticipe(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ablode-trait accent-ablode-vert"
        />
        <span className="text-[0.9375rem]">
          J’ai déjà participé à une édition de la marche
        </span>
      </label>

      <ChampFormulaire
        id="marche-motivation"
        libelle="Votre motivation (facultatif)"
        valeur={valeurs.motivation}
        onChange={(v) => maj('motivation', v)}
        lignes={4}
        aide="Ce qui vous amène à marcher avec nous."
      />

      <button type="submit" disabled={envoi} className="bouton-principal w-full">
        {envoi ? 'Envoi…' : 'Envoyer mon inscription'}
      </button>
    </form>
  );
}
