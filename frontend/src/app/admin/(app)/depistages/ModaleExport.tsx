'use client';

import { useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { telechargerFichier } from '@/lib/api';

/** Colonnes proposées à l'export ; les nominatives sont signalées. */
const COLONNES = [
  { cle: 'code_unique', libelle: 'Code', nominative: true },
  { cle: 'nom', libelle: 'Nom', nominative: true },
  { cle: 'prenom', libelle: 'Prénom', nominative: true },
  { cle: 'date_naissance', libelle: 'Date de naissance', nominative: true },
  { cle: 'age', libelle: 'Âge' },
  { cle: 'sexe', libelle: 'Sexe' },
  { cle: 'telephone', libelle: 'Téléphone', nominative: true },
  { cle: 'commune', libelle: 'Commune' },
  { cle: 'departement', libelle: 'Département' },
  { cle: 'campagne', libelle: 'Campagne' },
  { cle: 'date_depistage', libelle: 'Date du dépistage' },
  { cle: 'type', libelle: 'Type' },
  { cle: 'glycemie', libelle: 'Glycémie' },
  { cle: 'imc', libelle: 'IMC' },
  { cle: 'resultat', libelle: 'Résultat' },
  { cle: 'oriente_centre', libelle: 'Orienté vers un centre' },
  { cle: 'verifie', libelle: 'Vérifié' },
  { cle: 'source', libelle: 'Source' },
  { cle: 'notes', libelle: 'Notes', nominative: true },
];

export function ModaleExport({
  filtres,
  onFermer,
}: {
  filtres: Record<string, string | undefined>;
  onFermer: () => void;
}) {
  const { peut } = useAuth();
  // Le backend anonymise d'office les exports du rôle Viewer.
  const anonymiseImpose = !peut('super_admin', 'admin');

  const [format, setFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [choisies, setChoisies] = useState<Set<string>>(
    new Set(COLONNES.map((colonne) => colonne.cle)),
  );
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  function basculer(cle: string) {
    setChoisies((courante) => {
      const copie = new Set(courante);
      if (copie.has(cle)) copie.delete(cle);
      else copie.add(cle);
      return copie;
    });
  }

  async function telecharger() {
    setOccupe(true);
    setErreur('');

    const extension = format === 'excel' ? 'xlsx' : format;
    const horodatage = new Date().toISOString().slice(0, 10);

    try {
      await telechargerFichier(
        '/exports/depistages',
        {
          ...filtres,
          format,
          colonnes: [...choisies].join(','),
        },
        `depistages-${horodatage}.${extension}`,
      );
      onFermer();
    } catch {
      setErreur('Export impossible. Réessayez dans quelques instants.');
    } finally {
      setOccupe(false);
    }
  }

  const filtresActifs = Object.entries(filtres).filter(([, valeur]) => valeur);

  return (
    <Modale
      titre="Exporter les dépistages"
      sousTitre="Les filtres actifs de la liste sont appliqués à l’export"
      onFermer={onFermer}
    >
      {erreur && (
        <div className="mb-5">
          <Alerte type="erreur">{erreur}</Alerte>
        </div>
      )}

      {anonymiseImpose && (
        <div className="mb-5">
          <Alerte type="info">
            Votre rôle donne accès à des exports <strong>anonymisés</strong> : les
            colonnes nominatives seront retirées du fichier.
          </Alerte>
        </div>
      )}

      <fieldset>
        <legend className="etiquette mb-2">Format</legend>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['csv', 'CSV'],
              ['excel', 'Excel'],
              ['json', 'JSON'],
            ] as const
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              type="button"
              onClick={() => setFormat(valeur)}
              aria-pressed={format === valeur}
              className={`puce-filtre ${format === valeur ? 'puce-filtre-active' : ''}`}
            >
              {libelle}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="etiquette mb-2">Colonnes</legend>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {COLONNES.map((colonne) => {
            const desactivee = anonymiseImpose && colonne.nominative;
            return (
              <label
                key={colonne.cle}
                className={`flex items-center gap-2.5 text-sm ${
                  desactivee ? 'opacity-40' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={!desactivee && choisies.has(colonne.cle)}
                  disabled={desactivee}
                  onChange={() => basculer(colonne.cle)}
                  className="h-4 w-4 accent-admin-encre"
                />
                {colonne.libelle}
                {colonne.nominative && (
                  <span className="font-mono text-[0.6875rem] text-ablode-ambre">
                    nominatif
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {filtresActifs.length > 0 && (
        <p className="mt-6 bg-admin-fond px-4 py-3 font-mono text-[0.75rem] text-admin-gris">
          Filtres appliqués :{' '}
          {filtresActifs.map(([cle, valeur]) => `${cle}=${valeur}`).join(' · ')}
        </p>
      )}

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-admin-gris">
        Ce fichier contient des données de santé. Sa diffusion hors de l’association
        suppose une anonymisation préalable. L’export est enregistré dans le journal
        d’audit.
      </p>

      <div className="mt-7 flex justify-end gap-2">
        <button type="button" onClick={onFermer} className="admin-bouton-clair">
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void telecharger()}
          disabled={occupe || choisies.size === 0}
          className="admin-bouton"
        >
          {occupe ? 'Génération…' : 'Télécharger'}
        </button>
      </div>
    </Modale>
  );
}
