import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FormulaireBenevole } from './FormulaireBenevole';

export const metadata: Metadata = {
  alternates: { canonical: '/benevole' },
  openGraph: { url: '/benevole' },
  title: 'Devenir bénévole',
  description:
    'Rejoignez les équipes de terrain de l’ABLODE pour les campagnes de ' +
    'dépistage du diabète et de l’obésité au Bénin.',
};

export default async function PageBenevole() {
  const t = await getTranslations('benevole');

  return (
    <>
      <section className="bg-ablode-profond text-white">
        <div className="conteneur py-14">
          <p className="text-etiquette uppercase text-ablode-vert-clair">
            Rejoindre les équipes
          </p>
          <h1 className="mt-4 text-[2.25rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.75rem]">
            {t('titre')}
          </h1>
          <p className="mt-4 max-w-lecture text-[1.0625rem] leading-relaxed text-white/70">
            {t('chapeau')}
          </p>
        </div>
      </section>

      <div className="conteneur py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <div className="rounded-carte border border-ablode-trait bg-white p-7">
              <h2 className="etiquette mb-5">Ce que font nos bénévoles</h2>
              <ul className="space-y-4">
                {[
                  'Accueillir et orienter les personnes sur les postes de dépistage',
                  'Aider à la saisie des fiches sur tablette (formation assurée)',
                  'Distribuer les supports de sensibilisation',
                  'Participer à l’organisation de la marche « Sucre à terre »',
                ].map((tache) => (
                  <li
                    key={tache}
                    className="flex items-start gap-3 text-[0.9375rem] leading-relaxed"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ablode-vert-voile text-[0.6875rem] font-bold text-ablode-vert-sombre"
                    >
                      ✓
                    </span>
                    <span className="text-ablode-encre">{tache}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 rounded-carte border-l-[3px] border-ablode-vert bg-ablode-vert-voile p-5 text-[0.9375rem] leading-relaxed">
              Les gestes cliniques (piqûre capillaire, lecture de glycémie) restent
              réservés aux professionnels de santé qui encadrent chaque campagne.
            </p>
          </div>

          <FormulaireBenevole />
        </div>
      </div>
    </>
  );
}
