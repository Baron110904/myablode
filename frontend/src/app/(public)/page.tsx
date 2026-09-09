import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { SignalDepistage } from '@/components/carte/CartePouls';
import { BandeauAccueil } from '@/components/public/BandeauAccueil';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { FormulaireNewsletter } from '@/components/public/FormulaireNewsletter';
import { ImageArticle } from '@/components/public/ImageArticle';
import { Reveler } from '@/components/public/Reveler';
import { apiPublicOuDefaut } from '@/lib/api';
import { date, LIBELLES_CATEGORIE } from '@/lib/format';
import type { Article, Campagne, CarteGeoJson, ResumeStats } from '@/lib/types';

/** Chiffres et carte rafraîchis toutes les 5 minutes (section 3.1.1). */
export const revalidate = 300;

const RESUME_VIDE: ResumeStats = {
  totalDepistages: 0,
  casDetectes: 0,
  preDiabete: 0,
  orientesCentre: 0,
  communesCouvertes: 0,
  totalCommunes: 77,
  campagnesRealisees: 0,
  tauxPrevalence: 0,
  variationDepistages7j: 0,
  variationCas7j: 0,
};

const CARTE_VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

const ACTIONS = [
  {
    titre: 'Dépistage gratuit',
    texte:
      "Des tests de glycémie et des mesures d'IMC proposés gratuitement lors de campagnes de terrain, commune par commune.",
  },
  {
    titre: 'Marche « Sucre à terre »',
    texte:
      "Un événement sportif de 5 km qui remet l'activité physique au cœur de la prévention du diabète de type 2.",
  },
  {
    titre: 'Le diabète et nous',
    texte:
      'Un programme de sensibilisation aux dangers du diabète et du pied diabétique, animé avec des soignants.',
  },
];

export default async function PageAccueil() {
  const t = await getTranslations('accueil');
  const tNews = await getTranslations('newsletter');

  // Les quatre appels sont indépendants : les lancer en parallèle évite
  // d'additionner leurs latences dans le temps de rendu de la page.
  const [resume, carte, articles, campagneEnCours, derniers] = await Promise.all([
    apiPublicOuDefaut<ResumeStats>('/stats/resume', RESUME_VIDE, {
      params: { periode: 'tout' },
    }),
    apiPublicOuDefaut<CarteGeoJson>('/stats/carte', CARTE_VIDE, {
      params: { periode: 'tout' },
      revalidate: 900,
    }),
    apiPublicOuDefaut<Article[]>('/articles/recents', []),
    apiPublicOuDefaut<Campagne | null>('/campagnes/en-cours', null),
    /*
     * Point de départ de l'animation. Non mis en cache : c'est la référence
     * à partir de laquelle le navigateur repère les arrivées suivantes.
     */
    apiPublicOuDefaut<SignalDepistage[]>('/stats/derniers', [], { revalidate: 0 }),
  ]);

  return (
    <>
      {/* ─── Bannière ─────────────────────────────────────────────────── */}
      <BandeauAccueil carte={carte} resume={resume} signauxInitiaux={derniers}>
        <>
          {campagneEnCours && (
              <Reveler>
                <p className="mb-6 flex items-center gap-2.5 text-[0.875rem] font-semibold text-ablode-vert">
                  {/* Pastille pulsée : signale une opération en cours. */}
                  <span aria-hidden className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ablode-vert opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ablode-vert" />
                  </span>
                  {t('campagneEnCours')} —{' '}
                  {campagneEnCours.commune?.nom ?? campagneEnCours.nom}
                </p>
              </Reveler>
            )}

            <Reveler delai={60}>
              <h1 className="titre-affiche max-w-xl">{t('titre')}</h1>
            </Reveler>

            <Reveler delai={140}>
              <p className="mt-6 max-w-lg text-[1.0625rem] leading-relaxed text-ablode-gris">
                {t('chapeau')}
              </p>
            </Reveler>

            <Reveler delai={220}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/carte" className="bouton-principal group">
                  {t('explorerCarte')}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
                <Link href="/benevole" className="bouton-secondaire">
                  {t('devenirBenevole')}
                </Link>
              </div>
            </Reveler>
        </>
      </BandeauAccueil>

      {/* ─── Dernières actualités ─────────────────────────────────────── */}
      <section className="bg-ablode-voile">
        <div className="conteneur py-16">
          <Reveler>
            <div className="mb-10 flex items-end justify-between gap-6">
              <h2 className="titre-section">{t('surLeTerrain')}</h2>
              <Link
                href="/actualites"
                className="group shrink-0 text-[0.9375rem] font-semibold text-ablode-vert transition-colors hover:text-ablode-vert-sombre"
              >
                {t('toutesActualites')}{' '}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </Reveler>

          {articles.length === 0 ? (
            <p className="text-sm text-ablode-gris">{t('aucuneActualite')}</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, index) => (
                <Reveler as="li" key={article.id} delai={index * 90}>
                  <Link
                    href={`/actualites/${article.slug}`}
                    className="carte-contenu group flex h-full flex-col hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0"
                  >
                    <div className="overflow-hidden border-b border-ablode-trait">
                      <ImageArticle
                        src={article.image_url}
                        hauteur={190}
                        largeur={520}
                        className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="pastille-categorie">
                          {LIBELLES_CATEGORIE[article.categorie]}
                        </span>
                        <span className="text-[0.8125rem] text-ablode-gris">
                          {date(article.date_publication)}
                        </span>
                      </div>

                      <h3 className="text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] transition-colors group-hover:text-ablode-vert-sombre">
                        {article.titre}
                      </h3>
                      {article.extrait && (
                        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                          {article.extrait}
                        </p>
                      )}
                    </div>
                  </Link>
                </Reveler>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ─── Nos actions ──────────────────────────────────────────────── */}
      <section className="conteneur py-16">
        <Reveler>
          <h2 className="titre-section">{t('missions')}</h2>
        </Reveler>

        <div className="mt-9 grid gap-6 sm:grid-cols-3">
          {ACTIONS.map((action, index) => (
            <Reveler as="article" key={action.titre} delai={index * 90}>
              <div className="carte-contenu group h-full p-8 hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0">
                <span
                  aria-hidden
                  className="mb-5 block h-0.5 w-8 bg-ablode-vert transition-all duration-300 group-hover:w-14"
                />
                <h3 className="text-base font-bold">{action.titre}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ablode-gris">
                  {action.texte}
                </p>
              </div>
            </Reveler>
          ))}
        </div>

        <Reveler delai={120}>
          <p className="mt-8">
            <Link
              href="/resultats"
              className="group text-[0.9375rem] font-semibold text-ablode-vert transition-colors hover:text-ablode-vert-sombre"
            >
              {t('voirResultats')}{' '}
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </p>
        </Reveler>
      </section>

      {/* ─── Newsletter ───────────────────────────────────────────────── */}
      <section className="conteneur pb-4">
        <Reveler>
          <div className="rounded-bloc bg-ablode-nuit px-8 py-11 sm:px-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-white">{tNews('titre')}</h2>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/70">
                  {tNews('chapeau')}
                </p>
              </div>
              <FormulaireNewsletter variante="sombre" />
            </div>
          </div>
        </Reveler>
      </section>
    </>
  );
}
