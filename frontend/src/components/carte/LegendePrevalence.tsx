import { useTranslations } from 'next-intl';
import { LEGENDE_PREVALENCE } from '@/lib/format';

export function LegendePrevalence({
  orientation = 'verticale',
  avecTitre = true,
}: {
  orientation?: 'verticale' | 'horizontale';
  avecTitre?: boolean;
}) {
  const t = useTranslations('carte');

  return (
    <div>
      {avecTitre && <p className="etiquette mb-2.5">{t('prevalence')}</p>}
      <ul
        className={
          orientation === 'verticale'
            ? 'space-y-1.5'
            : 'flex flex-wrap items-center gap-x-4 gap-y-1.5'
        }
      >
        {LEGENDE_PREVALENCE.map((palier) => (
          <li key={palier.libelle} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="inline-block h-3 w-6 shrink-0"
              style={{ backgroundColor: palier.couleur }}
            />
            <span className="font-mono text-[0.6875rem] text-ablode-gris">
              {palier.libelle}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
