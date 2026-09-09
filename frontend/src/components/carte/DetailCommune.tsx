'use client';

import { useTranslations } from 'next-intl';
import { date, nombre, paliersPrevalence, pourcentage } from '@/lib/format';
import { libelleNiveau } from '@/lib/niveau-carte';
import type { ProprietesCommune } from './CarteBenin';

/**
 * Panneau détaillant le territoire cliqué (popup de la section 3.3.1).
 *
 * Le même panneau sert aux deux découpages : au niveau départemental, le
 * sous-titre porte le libellé du découpage plutôt qu'un département parent
 * qui répéterait le titre.
 */
export function DetailCommune({
  commune,
  onFermer,
}: {
  commune: ProprietesCommune;
  onFermer: () => void;
}) {
  const t = useTranslations('carte');
  const tk = useTranslations('kpi');
  const { couleur } = paliersPrevalence(commune.taux, commune.depistages);

  return (
    <div className="animate-apparition border border-ablode-trait bg-white p-5 shadow-carte">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 shrink-0 border border-black/10"
              style={{ backgroundColor: couleur }}
            />
            <h3 className="text-lg font-bold leading-tight">{commune.nom}</h3>
          </div>
          <p className="mt-1 pl-6 font-mono text-etiquette uppercase text-ablode-gris">
            {commune.niveau === 'departement'
              ? libelleNiveau(commune.niveau)
              : commune.departement}
          </p>
        </div>

        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer le détail"
          className="shrink-0 font-mono text-lg leading-none text-ablode-gris hover:text-ablode-encre"
        >
          ×
        </button>
      </div>

      {commune.depistages === 0 ? (
        <p className="mt-5 text-sm text-ablode-gris">{t('aucuneDonnee')}</p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
            <Ligne libelle={tk('depistages')} valeur={nombre(commune.depistages)} />
            <Ligne libelle={tk('cas')} valeur={nombre(commune.cas)} />
            <Ligne libelle="Diabète" valeur={nombre(commune.diabete)} />
            <Ligne libelle="Obésité" valeur={nombre(commune.obesite)} />
          </dl>

          {commune.couverture !== null && commune.population !== null && (
            <div className="mt-5 border-t border-ablode-trait pt-4">
              <dl className="flex items-baseline justify-between">
                <dt className="font-mono text-etiquette uppercase text-ablode-gris">
                  Dépistés pour 1 000 habitants
                </dt>
                <dd className="text-lg font-bold">
                  {commune.couverture.toLocaleString('fr-FR')}
                </dd>
              </dl>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ablode-gris">
                Population estimée : {nombre(commune.population)} habitants
                (projection 2024).
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-ablode-trait pt-4">
            <dl className="flex items-baseline justify-between">
              <dt className="etiquette">{tk('taux')}</dt>
              <dd className="text-2xl font-bold">{pourcentage(commune.taux)}</dd>
            </dl>
          </div>

          {commune.derniere_campagne && (
            <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-gris">
              {t('derniereCampagne')} : {date(commune.derniere_campagne)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="etiquette">{libelle}</dt>
      <dd className="mt-1 text-lg font-bold leading-none">{valeur}</dd>
    </div>
  );
}
