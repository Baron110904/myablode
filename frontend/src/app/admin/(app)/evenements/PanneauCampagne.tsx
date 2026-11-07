'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { editionNormalisee } from '@/lib/format';
import type { CampagneAccueil } from '@/lib/types';

/**
 * Le libellé d'édition annoncé sur le bandeau d'accueil.
 *
 * Il était tiré de la première date publiée du programme : vidé le
 * programme, l'accueil perdait son « 6ᵉ ». Il se saisit donc, ici, à côté
 * des dates auxquelles il se rapporte.
 */
export function PanneauCampagne({ modifiable }: { modifiable: boolean }) {
  const [edition, setEdition] = useState('');
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  /*
   * Lecture en échec : le champ reste vide alors que l'édition existe peut-
   * être en base. Enregistrer dans cet état l'effacerait sans que personne
   * ne l'ait demandé. On bloque donc la saisie jusqu'à une relecture
   * réussie.
   */
  const [lectureEchouee, setLectureEchouee] = useState(false);

  const charger = useCallback(async () => {
    try {
      const campagne = await apiAdmin<CampagneAccueil>('/evenements/campagne');
      setEdition(campagne.edition ?? '');
      setLectureEchouee(false);
    } catch {
      setLectureEchouee(true);
      setErreur(
        'Impossible de lire l’édition en cours. Rechargez la page avant de modifier : ' +
          'enregistrer maintenant effacerait ce qui est enregistré.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur('');
    setMessage('');
    setEnvoi(true);
    try {
      await apiAdmin('/evenements/campagne', {
        method: 'PUT',
        body: { edition: edition.trim() || null },
      });
      setMessage('Bandeau d’accueil mis à jour.');
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return (
      <div className="admin-panneau">
        <Chargement />
      </div>
    );
  }

  // Ce que le bandeau composera réellement : « 6ème » devient « 6ᵉ ».
  const apercu = editionNormalisee(edition);

  return (
    <form onSubmit={enregistrer} className="admin-panneau space-y-4 p-6">
      <div>
        <h2 className="text-[1.0625rem] font-bold">Édition en cours</h2>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-admin-gris">
          Affichée à côté du titre sur la page d’accueil. Laissez vide pour
          n’afficher que le titre.
        </p>
      </div>

      {erreur && (
        <Alerte type="erreur">
          {erreur}
          {lectureEchouee && (
            <button
              type="button"
              onClick={() => void charger()}
              className="ml-2 font-semibold underline"
            >
              Réessayer
            </button>
          )}
        </Alerte>
      )}
      {message && <Alerte type="succes">{message}</Alerte>}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="camp-edition" className="etiquette-douce mb-2 block">
            Libellé
          </label>
          <input
            id="camp-edition"
            type="text"
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
            maxLength={60}
            disabled={!modifiable || envoi || lectureEchouee}
            className="admin-champ"
            placeholder="6ème édition"
          />
        </div>

        {apercu && (
          <div className="rounded-carte bg-admin-nuit px-5 py-3 text-white">
            <p className="etiquette mb-1 !text-white/45">Sur le site</p>
            <p className="text-[1.0625rem] font-extrabold text-ablode-vert-clair">
              {apercu}
            </p>
          </div>
        )}

        {modifiable && (
          <button
            type="submit"
            disabled={envoi || lectureEchouee}
            className="admin-bouton"
          >
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        )}
      </div>

      <p className="text-[0.75rem] leading-relaxed text-admin-gris">
        Écrivez-le comme vous voulez : « 6ème », « 6e » ou « 6 ». Le site le
        composera en « 6ᵉ ».
      </p>
    </form>
  );
}
