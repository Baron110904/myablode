'use client';

import { useTranslations } from 'next-intl';
import { LegendePrevalence } from './LegendePrevalence';
import type { FiltresCarte, Periode, Sexe, TypeDepistage } from '@/lib/types';

const PERIODES: Array<{ valeur: Periode; cle: string }> = [
  { valeur: '7j', cle: 'septJours' },
  { valeur: '30j', cle: 'trenteJours' },
  { valeur: 'annee', cle: 'annee' },
  { valeur: 'tout', cle: 'tout' },
];

const TYPES: Array<{ valeur: TypeDepistage | 'tous'; cle: string }> = [
  { valeur: 'tous', cle: 'tous' },
  { valeur: 'diabete', cle: 'diabete' },
  { valeur: 'obesite', cle: 'obesite' },
  { valeur: 'endocrinopathie', cle: 'endocrinopathie' },
];

const TRANCHES: Array<{ libelle: string; min?: number; max?: number }> = [
  { libelle: 'Tous' },
  { libelle: '18–34', min: 18, max: 34 },
  { libelle: '35–54', min: 35, max: 54 },
  { libelle: '55 +', min: 55 },
];

/** Panneau de filtres partagé par la carte publique et la carte admin. */
export function PanneauFiltres({
  filtres,
  onChangement,
  avecLegende = true,
  compact = false,
}: {
  filtres: FiltresCarte;
  onChangement: (filtres: FiltresCarte) => void;
  avecLegende?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations('carte');
  const tc = useTranslations('commun');

  const maj = (partiel: Partial<FiltresCarte>) =>
    onChangement({ ...filtres, ...partiel });

  const trancheActive = (tranche: (typeof TRANCHES)[number]) =>
    filtres.ageMin === tranche.min && filtres.ageMax === tranche.max;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <Groupe titre={t('periode')}>
        {PERIODES.map((periode) => (
          <Puce
            key={periode.valeur}
            actif={filtres.periode === periode.valeur}
            onClick={() => maj({ periode: periode.valeur })}
          >
            {tc(periode.cle)}
          </Puce>
        ))}
      </Groupe>

      <Groupe titre={t('typeDepistage')}>
        {TYPES.map((type) => (
          <Puce
            key={type.valeur}
            actif={
              type.valeur === 'tous' ? !filtres.type : filtres.type === type.valeur
            }
            onClick={() =>
              maj({ type: type.valeur === 'tous' ? undefined : (type.valeur as TypeDepistage) })
            }
          >
            {tc(type.cle)}
          </Puce>
        ))}
      </Groupe>

      <Groupe titre={t('sexe')}>
        <Puce actif={!filtres.sexe} onClick={() => maj({ sexe: undefined })}>
          {tc('tous')}
        </Puce>
        {(['F', 'M'] as Sexe[]).map((sexe) => (
          <Puce
            key={sexe}
            actif={filtres.sexe === sexe}
            onClick={() => maj({ sexe })}
          >
            {sexe}
          </Puce>
        ))}
      </Groupe>

      <Groupe titre={t('trancheAge')}>
        {TRANCHES.map((tranche) => (
          <Puce
            key={tranche.libelle}
            actif={trancheActive(tranche)}
            onClick={() => maj({ ageMin: tranche.min, ageMax: tranche.max })}
          >
            {tranche.libelle}
          </Puce>
        ))}
      </Groupe>

      {avecLegende && (
        <div className="border-t border-ablode-trait pt-4">
          <LegendePrevalence />
        </div>
      )}
    </div>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="etiquette mb-2">{titre}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Puce({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`puce-filtre ${actif ? 'puce-filtre-active' : ''}`}
    >
      {children}
    </button>
  );
}
