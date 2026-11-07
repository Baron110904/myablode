'use client';

import { useRef, useState } from 'react';
import { ApiError, televerser, urlMedia } from '@/lib/api';

interface ImageDeposee {
  url: string;
  largeur: number;
  hauteur: number;
  taille: number;
}

/**
 * Champ d'image du back-office, commun à tous les formulaires.
 *
 * Le champ ne demandait qu'une adresse : l'administrateur devait donc
 * héberger sa photo ailleurs avant de pouvoir illustrer un article. Il peut
 * désormais la déposer directement ; l'adresse reste acceptée pour une image
 * déjà en ligne.
 *
 * Le serveur redimensionne et recompresse à la réception : la photo de
 * téléphone de cinq mégaoctets n'arrive pas telle quelle chez le visiteur.
 */
export function ChampImage({
  valeur,
  onChange,
  libelle,
  aide,
  desactive = false,
}: {
  valeur: string;
  onChange: (url: string) => void;
  libelle: string;
  aide?: string;
  desactive?: boolean;
}) {
  const champFichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState('');

  async function deposer(fichier: File | null) {
    if (!fichier) return;
    setErreur('');
    setEnvoi(true);
    setProgression(0);

    const corps = new FormData();
    corps.append('fichier', fichier);

    try {
      const image = await televerser<ImageDeposee>('/images', {
        formData: corps,
        onProgression: setProgression,
      });
      onChange(image.url);
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Dépôt impossible.',
      );
    } finally {
      setEnvoi(false);
      // Permet de redéposer le même fichier après une erreur : sans cela le
      // champ garde sa valeur et l'évènement `change` ne repart pas.
      if (champFichier.current) champFichier.current.value = '';
    }
  }

  return (
    <div>
      <p className="etiquette-douce mb-2">{libelle}</p>

      {valeur ? (
        <div className="overflow-hidden rounded-carte border border-admin-trait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlMedia(valeur)}
            alt=""
            className="h-[140px] w-full bg-admin-fond object-cover"
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate text-[0.75rem] text-admin-gris">
              {valeur.split('/').pop()}
            </span>
            <span className="flex shrink-0 gap-3">
              <button
                type="button"
                disabled={desactive || envoi}
                onClick={() => champFichier.current?.click()}
                className="text-[0.8125rem] font-semibold text-admin-vert hover:underline"
              >
                Remplacer
              </button>
              <button
                type="button"
                disabled={desactive || envoi}
                onClick={() => onChange('')}
                className="text-[0.8125rem] font-semibold text-admin-gris hover:underline"
              >
                Retirer
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={desactive || envoi}
          onClick={() => champFichier.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-carte border border-dashed border-admin-trait bg-admin-fond px-4 py-8 text-center transition-colors hover:border-admin-vert disabled:opacity-60"
        >
          <span className="text-[0.9375rem] font-semibold">
            {envoi ? `Envoi… ${progression} %` : 'Déposer une image'}
          </span>
          <span className="text-[0.75rem] text-admin-gris">
            JPEG, PNG ou WebP — 12 Mo au plus
          </span>
        </button>
      )}

      {/*
        Masqué, et retiré du parcours au clavier : ce sont les boutons
        au-dessus qui l'ouvrent. Laissé tabulable, il se présentait comme un
        champ sans nom à un lecteur d'écran, juste après un bouton qui fait
        déjà le travail.
      */}
      <input
        ref={champFichier}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void deposer(e.target.files?.[0] ?? null)}
        disabled={desactive || envoi}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      {erreur && (
        <p className="mt-2 text-[0.8125rem] text-admin-alerte">{erreur}</p>
      )}

      {/*
        L'adresse reste saisissable : une image déjà en ligne - sur le site
        d'un partenaire, dans une banque d'images - n'a pas à être
        redéposée pour être utilisée.
      */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[0.75rem] text-admin-gris hover:text-admin-encre">
          ou coller l’adresse d’une image en ligne
        </summary>
        <input
          type="url"
          value={valeur.startsWith('/uploads/') ? '' : valeur}
          onChange={(e) => onChange(e.target.value)}
          disabled={desactive || envoi}
          placeholder="https://…"
          className="admin-champ mt-2"
        />
      </details>

      {aide && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">{aide}</p>
      )}
    </div>
  );
}
