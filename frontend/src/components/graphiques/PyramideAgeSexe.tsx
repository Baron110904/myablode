'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { nombre } from '@/lib/format';
import type { RepartitionAgeSexe } from '@/lib/types';

/**
 * Figure 2 : pyramide des âges hommes / femmes.
 *
 * Dessinée en CSS plutôt qu'avec Chart.js : six lignes symétriques ne
 * justifient pas le poids d'un canvas, et le rendu HTML reste lisible par
 * les lecteurs d'écran.
 */
export function PyramideAgeSexe({ donnees }: { donnees: RepartitionAgeSexe[] }) {
  const t = useTranslations('resultats');
  const [deploye, setDeploye] = useState(false);

  const maximum = Math.max(
    1,
    ...donnees.map((ligne) => Math.max(ligne.hommes, ligne.femmes)),
  );

  // Les barres partent de zéro à l'affichage puis se déploient : la
  // comparaison entre tranches se lit pendant le mouvement.
  useEffect(() => {
    setDeploye(false);
    const minuteur = setTimeout(() => setDeploye(true), 60);
    return () => clearTimeout(minuteur);
  }, [donnees]);

  const largeur = (valeur: number) => (deploye ? `${(valeur / maximum) * 100}%` : '0%');

  return (
    <div>
      <ul className="space-y-3">
        {donnees.map((ligne, index) => (
          <li
            key={ligne.tranche}
            className="group grid grid-cols-[52px_1fr_1fr] items-center gap-2"
          >
            <span className="font-mono text-[0.6875rem] text-ablode-gris transition-colors group-hover:text-ablode-encre">
              {ligne.tranche}
            </span>

            <div className="flex justify-end" title={`${t('hommes')} : ${nombre(ligne.hommes)}`}>
              <span
                className="block h-4 bg-ablode-encre transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: largeur(ligne.hommes), transitionDelay: `${index * 60}ms` }}
              />
            </div>

            <div title={`${t('femmes')} : ${nombre(ligne.femmes)}`}>
              <span
                className="block h-4 bg-ablode-vert-clair transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{ width: largeur(ligne.femmes), transitionDelay: `${index * 60}ms` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-center gap-6">
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 bg-ablode-encre" />
          <span className="font-mono text-etiquette uppercase text-ablode-gris">
            {t('hommes')}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 bg-ablode-vert-clair" />
          <span className="font-mono text-etiquette uppercase text-ablode-gris">
            {t('femmes')}
          </span>
        </span>
      </div>

      {/* Table équivalente pour les lecteurs d'écran. */}
      <table className="sr-only">
        <caption>{t('ageSexe')}</caption>
        <thead>
          <tr>
            <th scope="col">Tranche d’âge</th>
            <th scope="col">{t('hommes')}</th>
            <th scope="col">{t('femmes')}</th>
          </tr>
        </thead>
        <tbody>
          {donnees.map((ligne) => (
            <tr key={ligne.tranche}>
              <th scope="row">{ligne.tranche}</th>
              <td>{nombre(ligne.hommes)}</td>
              <td>{nombre(ligne.femmes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
