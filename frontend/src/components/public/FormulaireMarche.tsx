'use client';

import Link from 'next/link';
import { useState } from 'react';
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
 * Les six champs sans lesquels une inscription n'est pas exploitable.
 *
 * Fonction, quartier et adresse électronique n'en sont plus : exiger la
 * profession, le quartier et un courriel pour marcher cinq kilomètres
 * écartait des participants qui n'ont ni l'un ni l'autre. Ils restent
 * proposés, et servent quand ils sont donnés.
 */
const OBLIGATOIRES = ['prenom', 'nom', 'age', 'sexe', 'ville', 'telephone'] as const;

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

  const remplis = OBLIGATOIRES.filter((champ) => valeurs[champ].trim() !== '').length;

  function verifier(): boolean {
    const trouvees: Record<string, string> = {};
    if (valeurs.nom.trim().length < 2) trouvees.nom = 'Indiquez votre nom.';
    if (valeurs.prenom.trim().length < 2) trouvees.prenom = 'Indiquez votre prénom.';
    const age = Number(valeurs.age);
    if (!Number.isInteger(age) || age < 3 || age > 120) {
      trouvees.age = 'Âge attendu entre 3 et 120 ans.';
    }
    if (valeurs.sexe !== 'M' && valeurs.sexe !== 'F') {
      trouvees.sexe = 'Indiquez femme ou homme.';
    }
    if (valeurs.ville.trim().length < 2) trouvees.ville = 'Indiquez votre ville.';
    if (valeurs.telephone.replace(/\D/g, '').length < 6) {
      trouvees.telephone = 'Indiquez un numéro de téléphone.';
    }

    /*
     * Les trois champs facultatifs ne sont contrôlés que s'ils sont remplis.
     * Les bornes reprennent celles du serveur : une saisie d'une seule lettre
     * passerait ici pour être rejetée là-bas, sans que personne comprenne
     * pourquoi.
     */
    const fonction = valeurs.fonction.trim();
    if (fonction && fonction.length < 2) {
      trouvees.fonction = 'Deux caractères au minimum, ou laissez vide.';
    }
    const quartier = valeurs.quartier.trim();
    if (quartier && quartier.length < 2) {
      trouvees.quartier = 'Deux caractères au minimum, ou laissez vide.';
    }
    const email = valeurs.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      trouvees.email = 'Adresse électronique invalide, ou laissez vide.';
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
          ville: valeurs.ville.trim(),
          telephone: valeurs.telephone.trim(),
          /*
           * Omis plutôt qu'envoyés vides : `JSON.stringify` laisse tomber
           * les propriétés indéfinies, et le serveur ne valide un champ
           * facultatif que s'il le reçoit. Une chaîne vide, elle, échouerait
           * au contrôle de longueur minimale.
           */
          fonction: valeurs.fonction.trim() || undefined,
          quartier: valeurs.quartier.trim() || undefined,
          email: valeurs.email.trim() || undefined,
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
      <div className="rounded-bloc border border-ablode-trait bg-white p-8 text-center shadow-relief sm:p-12">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ablode-vert-voile text-[1.5rem] text-ablode-vert-sombre"
        >
          ✓
        </span>
        <p className="etiquette mt-6">Inscription enregistrée</p>
        <h2 className="mx-auto mt-3 max-w-lg text-[1.5rem] font-bold leading-snug tracking-[-0.02em]">
          {confirmation}
        </h2>
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
    <form
      onSubmit={soumettre}
      noValidate
      className="rounded-bloc border border-ablode-trait bg-white p-6 shadow-relief sm:p-10"
    >
      {erreur && (
        <p
          role="alert"
          className="mb-6 rounded-carte border border-ablode-alerte bg-ablode-alerte-voile px-5 py-4 text-sm text-ablode-alerte"
        >
          {erreur}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Champ
          id="marche-prenom"
          libelle="Prénom"
          obligatoire
          valeur={valeurs.prenom}
          onChange={(v) => maj('prenom', v)}
          erreur={erreurs.prenom}
          autoComplete="given-name"
        />
        <Champ
          id="marche-nom"
          libelle="Nom"
          obligatoire
          valeur={valeurs.nom}
          onChange={(v) => maj('nom', v)}
          erreur={erreurs.nom}
          autoComplete="family-name"
        />

        <Champ
          id="marche-age"
          libelle="Âge"
          type="number"
          obligatoire
          placeholder="ans"
          valeur={valeurs.age}
          onChange={(v) => maj('age', v)}
          erreur={erreurs.age}
        />
        <ChoixSexe
          valeur={valeurs.sexe}
          onChange={(v) => maj('sexe', v)}
          erreur={erreurs.sexe}
        />

        <Champ
          id="marche-fonction"
          libelle="Fonction"
          placeholder="Élève, infirmier, commerçante…"
          valeur={valeurs.fonction}
          onChange={(v) => maj('fonction', v)}
          erreur={erreurs.fonction}
        />
        <Champ
          id="marche-ville"
          libelle="Ville"
          obligatoire
          valeur={valeurs.ville}
          onChange={(v) => maj('ville', v)}
          erreur={erreurs.ville}
          autoComplete="address-level2"
        />

        <div className="sm:col-span-2">
          <Champ
            id="marche-quartier"
            libelle="Quartier de provenance"
            valeur={valeurs.quartier}
            onChange={(v) => maj('quartier', v)}
            erreur={erreurs.quartier}
          />
        </div>

        <ChampTelephone
          valeur={valeurs.telephone}
          onChange={(v) => maj('telephone', v)}
          erreur={erreurs.telephone}
        />
        <Champ
          id="marche-email"
          libelle="Adresse électronique"
          type="email"
          placeholder="votre@email.bj"
          valeur={valeurs.email}
          onChange={(v) => maj('email', v)}
          erreur={erreurs.email}
          autoComplete="email"
          aide="Vous recevrez la lettre d’information de l’association."
        />
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-3.5 rounded-carte border border-ablode-trait bg-ablode-papier px-5 py-4">
        <input
          type="checkbox"
          checked={dejaParticipe}
          onChange={(e) => setDejaParticipe(e.target.checked)}
          className="h-[18px] w-[18px] rounded border-ablode-trait accent-ablode-vert"
        />
        <span className="text-[0.9375rem]">
          J’ai déjà participé à une édition de la marche
        </span>
      </label>

      <div className="mt-5">
        <Champ
          id="marche-motivation"
          libelle="Votre motivation"
          complement="(facultatif)"
          lignes={4}
          placeholder="Ce qui vous amène à marcher avec nous."
          valeur={valeurs.motivation}
          onChange={(v) => maj('motivation', v)}
        />
      </div>

      {/*
        Pied de formulaire : le décompte à gauche, l'envoi à droite. Il porte
        sur les seuls champs obligatoires — compter les facultatifs ferait
        croire à une saisie inachevée alors que le bulletin est bon à partir.
      */}
      <div className="mt-8 flex flex-col gap-5 border-t border-ablode-trait pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.875rem] text-ablode-gris">
          <span aria-hidden className="text-ablode-vert">
            *
          </span>{' '}
          Champs obligatoires · {remplis} / {OBLIGATOIRES.length} remplis
        </p>

        <button type="submit" disabled={envoi} className="bouton-principal">
          {envoi ? 'Envoi…' : 'Envoyer mon inscription'}
          {!envoi && (
            <span aria-hidden className="transition-transform duration-200">
              →
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─── Champs ─────────────────────────────────────────────────────────────
 *
 * Composés ici plutôt qu'empruntés à `ChampFormulaire` : la maquette du
 * bulletin pose des libellés en casse normale et des champs rectangulaires,
 * là où les formulaires de contact et de bénévolat gardent les étiquettes en
 * capitales et les champs en pilule. Modifier le composant partagé aurait
 * déplacé ces deux autres pages sans qu'on l'ait demandé.
 */

const CHAMP =
  'w-full rounded-carte border border-ablode-trait bg-ablode-papier px-4 py-3 ' +
  'text-[0.95rem] text-ablode-encre transition-all duration-200 ' +
  'placeholder:text-ablode-gris/70 hover:border-ablode-gris/50 ' +
  'focus:border-ablode-vert focus:bg-white focus:outline-none focus:ring-1 focus:ring-ablode-vert';

function Libelle({
  htmlFor,
  libelle,
  complement,
  obligatoire,
}: {
  htmlFor?: string;
  libelle: string;
  complement?: string;
  obligatoire?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[0.875rem] font-medium">
      {libelle}
      {complement && (
        <span className="ml-1.5 font-normal text-ablode-gris">{complement}</span>
      )}
      {obligatoire && (
        <span aria-hidden className="ml-1 text-ablode-vert">
          *
        </span>
      )}
    </label>
  );
}

function Champ({
  id,
  libelle,
  complement,
  type = 'text',
  valeur,
  onChange,
  obligatoire = false,
  erreur,
  aide,
  placeholder,
  autoComplete,
  lignes,
}: {
  id: string;
  libelle: string;
  complement?: string;
  type?: string;
  valeur: string;
  onChange: (valeur: string) => void;
  obligatoire?: boolean;
  erreur?: string;
  aide?: string;
  placeholder?: string;
  autoComplete?: string;
  lignes?: number;
}) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decritPar = [idAide, idErreur].filter(Boolean).join(' ') || undefined;

  const communes = {
    id,
    name: id,
    required: obligatoire,
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': decritPar,
    className: `${CHAMP} ${erreur ? 'champ-erreur' : ''}`,
    value: valeur,
    placeholder,
    autoComplete,
  };

  return (
    <div>
      <Libelle
        htmlFor={id}
        libelle={libelle}
        complement={complement}
        obligatoire={obligatoire}
      />

      {lignes ? (
        <textarea
          {...communes}
          rows={lignes}
          className={`${communes.className} leading-relaxed`}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input {...communes} type={type} onChange={(e) => onChange(e.target.value)} />
      )}

      {aide && (
        <p id={idAide} className="mt-1.5 text-[0.8125rem] text-ablode-gris">
          {aide}
        </p>
      )}
      {erreur && (
        <p
          id={idErreur}
          role="alert"
          className="mt-1.5 text-[0.8125rem] text-ablode-alerte"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}

/**
 * Sexe, en deux boutons côte à côte plutôt qu'en liste déroulante.
 *
 * Deux choix dans un menu demandent trois gestes là où deux suffisent. Des
 * boutons radio portent l'état réel : la navigation au clavier et les
 * lecteurs d'écran les annoncent comme un choix unique, ce qu'une paire de
 * `<button>` n'aurait pas fait.
 */
function ChoixSexe({
  valeur,
  onChange,
  erreur,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  erreur?: string;
}) {
  const options = [
    { code: 'F', libelle: 'Femme' },
    { code: 'M', libelle: 'Homme' },
  ];

  return (
    <fieldset>
      <legend className="mb-2 block text-[0.875rem] font-medium">
        Sexe
        <span aria-hidden className="ml-1 text-ablode-vert">
          *
        </span>
      </legend>

      <div
        className={`grid grid-cols-2 gap-1 rounded-carte border bg-ablode-papier p-1 ${
          erreur ? 'border-ablode-alerte' : 'border-ablode-trait'
        }`}
      >
        {options.map((option) => (
          <label
            key={option.code}
            className={`flex cursor-pointer items-center justify-center rounded-[0.6rem] px-4 py-2.5 text-[0.9375rem] transition-colors duration-200 ${
              valeur === option.code
                ? 'bg-ablode-vert font-semibold text-white'
                : 'text-ablode-encre hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="marche-sexe"
              value={option.code}
              checked={valeur === option.code}
              onChange={() => onChange(option.code)}
              aria-describedby={erreur ? 'marche-sexe-erreur' : undefined}
              className="sr-only"
            />
            {option.libelle}
          </label>
        ))}
      </div>

      {erreur && (
        <p
          id="marche-sexe-erreur"
          role="alert"
          className="mt-1.5 text-[0.8125rem] text-ablode-alerte"
        >
          {erreur}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Téléphone précédé de l'indicatif du Bénin.
 *
 * L'indicatif est affiché, pas saisi : il n'est ni modifiable ni envoyé. Le
 * montrer dit au participant qu'il n'a pas à le taper, et évite les numéros
 * enregistrés deux fois avec et sans « +229 ».
 */
function ChampTelephone({
  valeur,
  onChange,
  erreur,
}: {
  valeur: string;
  onChange: (valeur: string) => void;
  erreur?: string;
}) {
  return (
    <div>
      <Libelle htmlFor="marche-telephone" libelle="Téléphone" obligatoire />

      <div className="flex items-stretch gap-2">
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center rounded-carte border border-ablode-trait bg-ablode-voile px-4 text-[0.95rem] font-semibold text-ablode-gris"
        >
          +229
        </span>
        <input
          id="marche-telephone"
          name="marche-telephone"
          type="tel"
          required
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder="01 00 00 00 00"
          autoComplete="tel"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={`marche-telephone-aide${erreur ? ' marche-telephone-erreur' : ''}`}
          className={`${CHAMP} ${erreur ? 'champ-erreur' : ''}`}
        />
      </div>

      <p id="marche-telephone-aide" className="mt-1.5 text-[0.8125rem] text-ablode-gris">
        Pour vous joindre le jour de la marche.
      </p>
      {erreur && (
        <p
          id="marche-telephone-erreur"
          role="alert"
          className="mt-1.5 text-[0.8125rem] text-ablode-alerte"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}
