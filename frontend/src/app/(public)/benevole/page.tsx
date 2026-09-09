import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FormulaireBenevole } from './FormulaireBenevole';

export const metadata: Metadata = {
  title: 'Devenir bénévole',
  description:
    'Rejoignez les équipes de terrain de l’ABLODE pour les campagnes de ' +
    'dépistage du diabète et de l’obésité au Bénin.',
};

export default async function PageBenevole() {
  const t = await getTranslations('benevole');

  return (
    <div className="conteneur py-12">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
            {t('titre')}
          </h1>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ablode-gris">
            {t('chapeau')}
          </p>

          <div className="mt-10 border-t border-ablode-trait pt-8">
            <h2 className="etiquette mb-5">Ce que font nos bénévoles</h2>
            <ul className="space-y-4">
              {[
                'Accueillir et orienter les personnes sur les postes de dépistage',
                'Aider à la saisie des fiches sur tablette (formation assurée)',
                'Distribuer les supports de sensibilisation',
                'Participer à l’organisation de la marche « Sucre à terre »',
              ].map((tache) => (
                <li key={tache} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <span aria-hidden className="mt-2 h-1 w-3 shrink-0 bg-ablode-vert" />
                  <span className="text-ablode-encre">{tache}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 border-l-2 border-ablode-vert bg-ablode-voile p-5 text-[0.9375rem] leading-relaxed">
            Les gestes cliniques (piqûre capillaire, lecture de glycémie) restent réservés
            aux professionnels de santé qui encadrent chaque campagne.
          </p>
        </div>

        <FormulaireBenevole />
      </div>
    </div>
  );
}
