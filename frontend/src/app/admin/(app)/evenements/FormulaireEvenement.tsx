'use client';

import { useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import type { Evenement } from '@/lib/types';

interface Valeurs {
  titre: string;
  sous_titre: string;
  date_debut: string;
  date_fin: string;
  lieu: string;
  description: string;
  edition: string;
  publie: boolean;
}

function valeursInitiales(evenement: Evenement | null): Valeurs {
  return {
    titre: evenement?.titre ?? '',
    sous_titre: evenement?.sous_titre ?? '',
    // Les champs `date` du navigateur n'acceptent que « AAAA-MM-JJ ».
    date_debut: evenement?.date_debut?.slice(0, 10) ?? '',
    date_fin: evenement?.date_fin?.slice(0, 10) ?? '',
    lieu: evenement?.lieu ?? '',
    description: evenement?.description ?? '',
    edition: evenement?.edition ?? '',
    publie: evenement?.publie ?? true,
  };
}

export function FormulaireEvenement({
  evenement,
  onFermer,
  onEnregistre,
}: {
  evenement: Evenement | null;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const [valeurs, setValeurs] = useState<Valeurs>(() => valeursInitiales(evenement));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = <C extends keyof Valeurs>(cle: C, valeur: Valeurs[C]) =>
    setValeurs((precedent) => ({ ...precedent, [cle]: valeur }));

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');

    if (!valeurs.titre.trim()) {
      setErreur('Le titre est obligatoire.');
      return;
    }
    if (!valeurs.date_debut) {
      setErreur('La date de début est obligatoire.');
      return;
    }
    if (valeurs.date_fin && valeurs.date_fin < valeurs.date_debut) {
      setErreur('La date de fin ne peut pas précéder la date de début.');
      return;
    }

    /*
     * Les champs facultatifs vidés partent à `null`, jamais `undefined` :
     * une clé absente du JSON laisse la valeur inchangée en base, et
     * l'administrateur qui efface un lieu le verrait réapparaître.
     */
    const corps = {
      titre: valeurs.titre.trim(),
      sous_titre: valeurs.sous_titre.trim() || null,
      date_debut: valeurs.date_debut,
      date_fin: valeurs.date_fin || null,
      lieu: valeurs.lieu.trim() || null,
      description: valeurs.description.trim() || null,
      edition: valeurs.edition.trim() || null,
      publie: valeurs.publie,
    };

    setEnvoi(true);
    try {
      if (evenement) {
        await apiAdmin(`/evenements/${evenement.id}`, { method: 'PATCH', body: corps });
        onEnregistre(`« ${corps.titre} » mis à jour.`);
      } else {
        await apiAdmin('/evenements', { method: 'POST', body: corps });
        onEnregistre(`« ${corps.titre} » ajouté au programme.`);
      }
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={evenement ? 'Modifier la date' : 'Ajouter une date'}
      sousTitre="Bandeau d’accueil et encart « Les grandes dates »"
      onFermer={onFermer}
      large
    >
      <form onSubmit={soumettre} className="space-y-5">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}

        <div>
          <label htmlFor="titre" className="etiquette-douce mb-2 block">
            Titre
          </label>
          <input
            id="titre"
            type="text"
            value={valeurs.titre}
            onChange={(e) => maj('titre', e.target.value)}
            maxLength={200}
            className="admin-champ"
            placeholder="Grande marche « Sucre à terre »"
          />
        </div>

        <div>
          <label htmlFor="sous_titre" className="etiquette-douce mb-2 block">
            Sous-titre <span className="text-admin-gris">(facultatif)</span>
          </label>
          <input
            id="sous_titre"
            type="text"
            value={valeurs.sous_titre}
            onChange={(e) => maj('sous_titre', e.target.value)}
            maxLength={255}
            className="admin-champ"
            placeholder="Dépistage gratuit et don de sang"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="date_debut" className="etiquette-douce mb-2 block">
              Date de début
            </label>
            <input
              id="date_debut"
              type="date"
              value={valeurs.date_debut}
              onChange={(e) => maj('date_debut', e.target.value)}
              className="admin-champ"
            />
          </div>

          <div>
            <label htmlFor="date_fin" className="etiquette-douce mb-2 block">
              Date de fin <span className="text-admin-gris">(facultatif)</span>
            </label>
            <input
              id="date_fin"
              type="date"
              value={valeurs.date_fin}
              min={valeurs.date_debut || undefined}
              onChange={(e) => maj('date_fin', e.target.value)}
              className="admin-champ"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="lieu" className="etiquette-douce mb-2 block">
              Lieu <span className="text-admin-gris">(facultatif)</span>
            </label>
            <input
              id="lieu"
              type="text"
              value={valeurs.lieu}
              onChange={(e) => maj('lieu', e.target.value)}
              maxLength={200}
              className="admin-champ"
              placeholder="Place de l’Amazone, Cotonou"
            />
          </div>

          <div>
            <label htmlFor="edition" className="etiquette-douce mb-2 block">
              Édition <span className="text-admin-gris">(facultatif)</span>
            </label>
            <input
              id="edition"
              type="text"
              value={valeurs.edition}
              onChange={(e) => maj('edition', e.target.value)}
              maxLength={60}
              className="admin-champ"
              placeholder="6ᵉ édition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="etiquette-douce mb-2 block">
            Description
          </label>
          <textarea
            id="description"
            value={valeurs.description}
            onChange={(e) => maj('description', e.target.value)}
            maxLength={1000}
            rows={3}
            className="admin-champ-multiligne"
            placeholder="Phrase reprise telle quelle dans l’encart de l’accueil."
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-carte border border-admin-trait p-4 transition-colors hover:bg-admin-fond">
          <input
            type="checkbox"
            checked={valeurs.publie}
            onChange={(e) => maj('publie', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-admin-vert"
          />
          <span className="text-sm">
            <span className="font-semibold">Visible sur le site</span>
            <span className="mt-1 block text-[0.8125rem] leading-relaxed text-admin-gris">
              Le bandeau d’accueil n’affiche que les dates à venir : une date
              passée disparaît d’elle-même, sans rien décocher.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-admin-trait pt-5">
          <button type="button" onClick={onFermer} className="admin-bouton-clair">
            Annuler
          </button>
          <button type="submit" disabled={envoi} className="admin-bouton">
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modale>
  );
}
