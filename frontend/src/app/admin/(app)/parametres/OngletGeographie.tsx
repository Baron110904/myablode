'use client';

import { useEffect, useRef, useState } from 'react';
import { Alerte, Panneau } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { nombre } from '@/lib/format';
import type { Commune } from '@/lib/types';

interface ResultatUpload {
  misesAJour: number;
  ignorees: string[];
}

/** Mise à jour du fond cartographique (US-ADM-16, section 3.3.3). */
export function OngletGeographie() {
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [resultat, setResultat] = useState<ResultatUpload | null>(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void apiAdmin<Commune[]>('/communes')
      .then(setCommunes)
      .catch(() => undefined);
  }, []);

  async function televerser(fichier: File) {
    setEnvoi(true);
    setErreur('');
    setResultat(null);

    const formData = new FormData();
    formData.append('file', fichier);

    try {
      setResultat(
        await apiAdmin<ResultatUpload>('/communes/geojson', {
          method: 'POST',
          formData,
        }),
      );
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Téléversement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  const parDepartement = communes.reduce<Record<string, number>>((acc, commune) => {
    const departement = commune.departement ?? 'Non renseigné';
    acc[departement] = (acc[departement] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {erreur && (
        <Alerte type="erreur" onFermer={() => setErreur('')}>
          {erreur}
        </Alerte>
      )}

      {resultat && (
        <Alerte type={resultat.ignorees.length > 0 ? 'attention' : 'succes'}>
          {nombre(resultat.misesAJour)} commune(s) mise(s) à jour.
          {resultat.ignorees.length > 0 && (
            <>
              {' '}
              {resultat.ignorees.length} entrée(s) du fichier n’ont pas été reconnues :{' '}
              <span className="font-mono text-[0.8125rem]">
                {resultat.ignorees.slice(0, 10).join(', ')}
                {resultat.ignorees.length > 10 && '…'}
              </span>
            </>
          )}
        </Alerte>
      )}

      <Panneau titre="Référentiel géographique">
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="etiquette">Communes en base</dt>
            <dd className="mt-2 text-[1.75rem] font-bold leading-none">
              {nombre(communes.length)}
            </dd>
          </div>
          <div>
            <dt className="etiquette">Départements</dt>
            <dd className="mt-2 text-[1.75rem] font-bold leading-none">
              {nombre(Object.keys(parDepartement).length)}
            </dd>
          </div>
          <div>
            <dt className="etiquette">Contours chargés</dt>
            <dd className="mt-2 text-[1.75rem] font-bold leading-none">
              {nombre(communes.length)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-admin-trait pt-5">
          <h3 className="etiquette mb-3">Répartition par département</h3>
          <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(parDepartement)
              .sort(([a], [b]) => a.localeCompare(b, 'fr'))
              .map(([departement, total]) => (
                <li
                  key={departement}
                  className="flex justify-between border-b border-admin-trait py-1.5 text-sm"
                >
                  <span>{departement}</span>
                  <span className="font-mono text-admin-gris">{total}</span>
                </li>
              ))}
          </ul>
        </div>
      </Panneau>

      <Panneau titre="Mettre à jour les contours">
        <p className="max-w-2xl text-sm leading-relaxed text-admin-gris">
          Téléversez un fichier GeoJSON de type <code>FeatureCollection</code>. Les
          communes sont appariées <strong>par nom</strong> (insensible aux accents et à la
          casse) : seules les géométries sont remplacées, les dépistages déjà rattachés
          restent intacts.
        </p>

        <div className="mt-5 border-2 border-dashed border-admin-trait bg-admin-fond px-6 py-10 text-center">
          <input
            ref={champFichier}
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            className="sr-only"
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              if (fichier) void televerser(fichier);
            }}
          />
          <button
            type="button"
            onClick={() => champFichier.current?.click()}
            disabled={envoi}
            className="admin-bouton"
          >
            {envoi ? 'Téléversement…' : 'Choisir un fichier GeoJSON'}
          </button>
          <p className="mt-3 font-mono text-[0.75rem] text-admin-gris">
            Fichier .geojson · 25 Mo maximum
          </p>
        </div>

        <p className="mt-5 text-[0.75rem] leading-relaxed text-admin-gris">
          Source actuelle : geoBoundaries ADM2 (données ouvertes). Après mise à jour, le
          cache de la carte est vidé automatiquement.
        </p>
      </Panneau>
    </div>
  );
}
