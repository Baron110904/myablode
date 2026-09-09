'use client';

import { useTranslations } from 'next-intl';
import { CompteurAnime } from './CompteurAnime';
import { nombre, pourcentage, variation } from '@/lib/format';
import type { ResumeStats } from '@/lib/types';

/**
 * Bandeau des quatre chiffres clés (sections 3.1.1 et 3.1.2).
 *
 * Les valeurs montent depuis zéro à l'entrée à l'écran : sur des chiffres de
 * santé publique, l'animation donne une idée de l'ordre de grandeur avant
 * même d'avoir lu le nombre.
 */
export function ChiffresCles({
  resume,
  avecVariations = false,
  compact = false,
  animer = true,
}: {
  resume: ResumeStats;
  avecVariations?: boolean;
  compact?: boolean;
  /**
   * Montée depuis zéro. À couper quand la valeur change en continu : le
   * compteur repartirait de zéro à chaque incrément.
   */
  animer?: boolean;
}) {
  const t = useTranslations('kpi');

  const cartes = [
    {
      libelle: t('depistages'),
      valeur: resume.totalDepistages,
      format: 'entier' as const,
      detail: avecVariations
        ? `${variation(resume.variationDepistages7j)} ${t('parSemaine')}`
        : null,
    },
    {
      libelle: t('cas'),
      valeur: resume.casDetectes,
      format: 'entier' as const,
      detail: avecVariations
        ? `${variation(resume.variationCas7j)} ${t('parSemaine')}`
        : null,
    },
    {
      libelle: t('communes'),
      valeur: resume.communesCouvertes,
      format: 'entier' as const,
      detail: avecVariations ? `${t('sur')} ${nombre(resume.totalCommunes)}` : null,
    },
    {
      libelle: t('taux'),
      valeur: resume.tauxPrevalence,
      format: 'pourcentage' as const,
      detail: null,
    },
  ];

  return (
    <dl
      className={
        compact
          ? 'grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4'
          : 'grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4'
      }
    >
      {cartes.map((carte) => (
        <div key={carte.libelle} className="group">
          <dd
            className={`tabular-nums ${
              compact ? 'text-2xl font-bold leading-none' : 'chiffre-cle'
            }`}
          >
            {animer ? (
              <CompteurAnime valeur={carte.valeur} format={carte.format} />
            ) : (
              formaterValeur(carte.valeur, carte.format)
            )}
          </dd>
          {/*
            Le libellé et sa variation tiennent sur la même ligne : la maquette
            les lit ensemble, le second qualifiant le premier.
          */}
          <dt className="mt-2 flex flex-wrap items-baseline gap-x-2.5">
            <span className="etiquette-douce transition-colors group-hover:text-ablode-encre">
              {carte.libelle}
            </span>
            {carte.detail && (
              <span className="text-[0.8125rem] font-semibold text-ablode-vert">
                {carte.detail}
              </span>
            )}
          </dt>
        </div>
      ))}
    </dl>
  );
}

/** Même rendu que le compteur animé, mais figé sur la valeur courante. */
function formaterValeur(valeur: number, format: 'entier' | 'pourcentage'): string {
  return format === 'pourcentage' ? pourcentage(valeur) : nombre(valeur);
}
