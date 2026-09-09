'use client';

import { useRef, useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { nombre } from '@/lib/format';
import { ExplicationSeuils } from '@/components/admin/ExplicationSeuils';
import type { ApercuFichier, Campagne, RapportImport } from '@/lib/types';

/** Champs de `depistages` qu'une colonne de fichier peut alimenter. */
const CHAMPS_CIBLES: Array<{ valeur: string; libelle: string; requis?: boolean }> = [
  { valeur: '', libelle: '— Ignorer cette colonne' },
  { valeur: 'code_unique', libelle: 'code_unique' },
  { valeur: 'nom', libelle: 'nom', requis: true },
  { valeur: 'prenom', libelle: 'prenom' },
  { valeur: 'date_naissance', libelle: 'date_naissance', requis: true },
  { valeur: 'sexe', libelle: 'sexe', requis: true },
  { valeur: 'telephone', libelle: 'telephone' },
  { valeur: 'commune_id', libelle: 'commune_id', requis: true },
  { valeur: 'date_depistage', libelle: 'date_depistage', requis: true },
  { valeur: 'type', libelle: 'type' },
  { valeur: 'glycemie', libelle: 'glycemie' },
  { valeur: 'imc', libelle: 'imc' },
  { valeur: 'resultat', libelle: 'resultat' },
  { valeur: 'oriente_centre', libelle: 'oriente_centre' },
  { valeur: 'notes', libelle: 'notes' },
];

const REQUIS = CHAMPS_CIBLES.filter((champ) => champ.requis).map((champ) => champ.valeur);

type Etape = 'fichier' | 'mapping' | 'rapport';

/**
 * Assistant d'import en trois étapes (section 3.2.3.B) :
 * dépôt du fichier → correspondance des colonnes → rapport détaillé.
 */
export function ModaleImport({
  campagnes,
  onFermer,
  onTermine,
}: {
  campagnes: Campagne[];
  onFermer: () => void;
  onTermine: (rapport: RapportImport) => void;
}) {
  const [etape, setEtape] = useState<Etape>('fichier');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<ApercuFichier | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [campagneId, setCampagneId] = useState('');
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [survol, setSurvol] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  async function analyser(fichierChoisi: File) {
    setOccupe(true);
    setErreur('');
    setFichier(fichierChoisi);

    const formData = new FormData();
    formData.append('file', fichierChoisi);

    try {
      const resultat = await apiAdmin<ApercuFichier>('/imports/apercu', {
        method: 'POST',
        formData,
      });
      setApercu(resultat);
      setMapping(resultat.mappingSuggere);
      setEtape('mapping');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError
          ? erreurAttrapee.message
          : 'Lecture du fichier impossible.',
      );
      setFichier(null);
    } finally {
      setOccupe(false);
    }
  }

  const champsCouverts = new Set(Object.values(mapping).filter(Boolean));
  const manquants = REQUIS.filter((champ) => !champsCouverts.has(champ));

  async function importer() {
    if (!fichier || manquants.length > 0) return;

    setOccupe(true);
    setErreur('');

    const formData = new FormData();
    formData.append('file', fichier);
    formData.append('mapping', JSON.stringify(mapping));
    if (campagneId) formData.append('campagneId', campagneId);

    try {
      const resultat = await apiAdmin<RapportImport>('/imports/depistages', {
        method: 'POST',
        formData,
      });
      setRapport(resultat);
      setEtape('rapport');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Import impossible.',
      );
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Modale
      titre="Importer un fichier"
      sousTitre="Associez les colonnes du fichier aux champs de la base"
      onFermer={onFermer}
      large
    >
      <nav className="mb-7 flex gap-8 border-b border-admin-trait" aria-label="Étapes">
        {(
          [
            ['fichier', '1 · Fichier'],
            ['mapping', '2 · Mapping'],
            ['rapport', '3 · Rapport'],
          ] as const
        ).map(([cle, libelle]) => (
          <span
            key={cle}
            aria-current={etape === cle ? 'step' : undefined}
            className={`-mb-px border-b-2 pb-3 font-mono text-etiquette uppercase ${
              etape === cle
                ? 'border-admin-vert text-admin-vert'
                : 'border-transparent text-admin-gris'
            }`}
          >
            {libelle}
          </span>
        ))}
      </nav>

      {erreur && (
        <div className="mb-5">
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        </div>
      )}

      {/* ─── Étape 1 : dépôt du fichier ─────────────────────────────── */}
      {etape === 'fichier' && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setSurvol(true);
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSurvol(false);
              const depose = e.dataTransfer.files?.[0];
              if (depose) void analyser(depose);
            }}
            className={`flex flex-col items-center justify-center border-2 border-dashed px-6 py-16 text-center transition-colors ${
              survol ? 'border-admin-vert bg-admin-actif' : 'border-admin-trait bg-admin-fond'
            }`}
          >
            <p className="text-sm font-bold">
              Glissez votre fichier ici, ou sélectionnez-le
            </p>
            <p className="mt-2 font-mono text-[0.8125rem] text-admin-gris">
              Formats acceptés : .csv, .xlsx, .xls — 20 Mo maximum
            </p>

            <input
              ref={champFichier}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="sr-only"
              onChange={(e) => {
                const choisi = e.target.files?.[0];
                if (choisi) void analyser(choisi);
              }}
            />
            <button
              type="button"
              onClick={() => champFichier.current?.click()}
              disabled={occupe}
              className="admin-bouton mt-6"
            >
              {occupe ? 'Lecture…' : 'Choisir un fichier'}
            </button>
          </div>

          <p className="mt-5 text-[0.8125rem] leading-relaxed text-admin-gris">
            Le fichier n’est pas encore importé : l’étape suivante affiche un aperçu et
            vous laisse vérifier la correspondance des colonnes.
          </p>
        </div>
      )}

      {/* ─── Étape 2 : correspondance des colonnes ──────────────────── */}
      {etape === 'mapping' && apercu && (
        <div>
          {/*
            Rappel du traitement avant de valider : c'est ici qu'on se demande
            ce que deviendront les valeurs douteuses du fichier.
          */}
          <div className="mb-4">
            <ExplicationSeuils
              compact
              seuils={{
                glycemieNormale: 100,
                glycemieDiabete: 126,
                imcSurpoids: 25,
                imcObesite: 30,
              }}
            />
          </div>

          <p className="rounded-full bg-admin-actif px-4 py-3 font-mono text-[0.8125rem]">
            {apercu.nomFichier}{' '}
            <span className="text-admin-gris">
              {nombre(apercu.totalLignes)} lignes · {apercu.colonnes.length} colonnes
            </span>
          </p>

          <div className="mt-6">
            <h3 className="etiquette mb-3">Aperçu des 10 premières lignes</h3>
            <div className="max-h-52 overflow-auto border border-admin-trait">
              <table className="w-full">
                <thead className="sticky top-0 bg-admin-fond">
                  <tr>
                    {apercu.colonnes.map((colonne) => (
                      <th
                        key={colonne}
                        className="whitespace-nowrap px-3 py-2 text-left font-mono text-[0.6875rem] uppercase text-admin-gris"
                      >
                        {colonne}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {apercu.lignes.map((ligne, index) => (
                    <tr key={index}>
                      {apercu.colonnes.map((colonne) => (
                        <td
                          key={colonne}
                          className="whitespace-nowrap px-3 py-2 text-[0.8125rem]"
                        >
                          {ligne[colonne] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-7">
            <h3 className="etiquette mb-3">Associer les colonnes</h3>
            <ul className="space-y-2">
              {apercu.colonnes.map((colonne) => (
                <li key={colonne} className="grid grid-cols-[1fr_28px_1fr] items-center gap-3">
                  <span className="truncate bg-admin-fond px-3 py-2.5 font-mono text-[0.8125rem]">
                    {colonne}
                  </span>
                  <span aria-hidden className="text-center text-admin-gris">
                    →
                  </span>
                  <select
                    value={mapping[colonne] ?? ''}
                    onChange={(e) =>
                      setMapping((courant) => ({ ...courant, [colonne]: e.target.value }))
                    }
                    aria-label={`Champ cible pour ${colonne}`}
                    className="admin-champ font-mono text-[0.8125rem]"
                  >
                    {CHAMPS_CIBLES.map((champ) => (
                      <option key={champ.valeur} value={champ.valeur}>
                        {champ.libelle}
                        {champ.requis ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7">
            <label htmlFor="campagne-import" className="etiquette mb-2 block">
              Rattacher à une campagne (facultatif)
            </label>
            <select
              id="campagne-import"
              value={campagneId}
              onChange={(e) => setCampagneId(e.target.value)}
              className="admin-champ"
            >
              <option value="">Aucune campagne</option>
              {campagnes.map((campagne) => (
                <option key={campagne.id} value={campagne.id}>
                  {campagne.nom}
                </option>
              ))}
            </select>
          </div>

          {manquants.length > 0 && (
            <div className="mt-5">
              <Alerte type="attention">
                Champs obligatoires non associés :{' '}
                <strong>{manquants.join(', ')}</strong>. Associez-les pour lancer
                l’import.
              </Alerte>
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void importer()}
              disabled={occupe || manquants.length > 0}
              className="admin-bouton"
            >
              {occupe ? 'Import en cours…' : 'Valider et importer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEtape('fichier');
                setApercu(null);
                setFichier(null);
              }}
              className="admin-bouton-clair"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {/* ─── Étape 3 : rapport ──────────────────────────────────────── */}
      {etape === 'rapport' && rapport && (
        <div>
          <div className="grid grid-cols-2 gap-px bg-admin-trait sm:grid-cols-4">
            <Bilan libelle="Lignes traitées" valeur={rapport.totalLignes} />
            <Bilan libelle="Importées" valeur={rapport.importees} accent="vert" />
            <Bilan libelle="Doublons ignorés" valeur={rapport.ignorees} />
            <Bilan
              libelle="En erreur"
              valeur={rapport.erreurs}
              accent={rapport.erreurs > 0 ? 'rouge' : undefined}
            />
          </div>

          {rapport.detailErreurs.length > 0 && (
            <div className="mt-6">
              <h3 className="etiquette mb-3">
                Lignes rejetées ({rapport.detailErreurs.length} premières)
              </h3>
              <ul className="max-h-56 divide-y divide-admin-trait overflow-auto border border-admin-trait">
                {rapport.detailErreurs.map((detail) => (
                  <li key={detail.ligne} className="flex gap-4 px-4 py-2.5 text-[0.8125rem]">
                    <span className="shrink-0 font-mono text-admin-gris">
                      Ligne {detail.ligne}
                    </span>
                    <span>{detail.raison}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-admin-gris">
                Les lignes rejetées n’ont pas été enregistrées. Corrigez-les dans le
                fichier source puis relancez un import : les lignes déjà importées seront
                détectées comme doublons et ignorées.
              </p>
            </div>
          )}

          <div className="mt-7 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onTermine(rapport)}
              className="admin-bouton"
            >
              Terminer
            </button>
          </div>
        </div>
      )}
    </Modale>
  );
}

function Bilan({
  libelle,
  valeur,
  accent,
}: {
  libelle: string;
  valeur: number;
  accent?: 'vert' | 'rouge';
}) {
  const couleur =
    accent === 'vert'
      ? 'text-admin-vert'
      : accent === 'rouge'
        ? 'text-ablode-alerte'
        : 'text-admin-encre';

  return (
    <div className="bg-white px-5 py-4">
      <p className="etiquette">{libelle}</p>
      <p className={`mt-2 text-2xl font-bold leading-none ${couleur}`}>{nombre(valeur)}</p>
    </div>
  );
}
