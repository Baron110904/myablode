import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FormulaireNewsletter } from '@/components/public/FormulaireNewsletter';
import { ImageArticle } from '@/components/public/ImageArticle';
import { Reveler } from '@/components/public/Reveler';
import { SectionVideos } from '@/components/public/SectionVideos';
import { RechercheArticles } from './RechercheArticles';
import { apiPublicOuDefaut } from '@/lib/api';
import { date, LIBELLES_CATEGORIE } from '@/lib/format';
import type { Article, CategorieArticle, Paginated, Video } from '@/lib/types';

export const metadata: Metadata = {
  alternates: { canonical: '/actualites' },
  openGraph: { url: '/actualites' },
  title: 'Actualités',
  description:
    'Campagnes de terrain, actions de sensibilisation et résultats de ' +
    'l’ABLODE, association béninoise de lutte contre le diabète et l’obésité.',
};

const VIDE: Paginated<Article> = { items: [], total: 0, page: 1, limit: 12, pages: 1 };

export const revalidate = 300;

/*
 * Depuis Next 15, `params` et `searchParams` arrivent sous forme de
 * promesses : le rendu peut commencer avant que la requete soit
 * entierement analysee. Il faut donc les attendre avant de les lire.
 */
export default async function PageActualites({
  searchParams: searchParamsPromesse,
}: {
  searchParams: Promise<{ categorie?: string; recherche?: string; page?: string }>;
}) {
  const searchParams = await searchParamsPromesse;
  const t = await getTranslations('actualites');
  const tc = await getTranslations('commun');
  const tNews = await getTranslations('newsletter');

  const page = Number(searchParams.page) || 1;

  const [articles, categories, videos] = await Promise.all([
    apiPublicOuDefaut<Paginated<Article>>('/articles/publies', VIDE, {
      params: {
        page,
        limit: 12,
        categorie: searchParams.categorie,
        recherche: searchParams.recherche,
      },
      // Une recherche ne doit pas être servie depuis un cache partagé.
      revalidate: searchParams.recherche ? 0 : 300,
    }),
    apiPublicOuDefaut<Array<{ categorie: CategorieArticle; total: number }>>(
      '/articles/categories',
      [],
    ),
    apiPublicOuDefaut<Video[]>('/videos/publiees', []),
  ]);

  const construireLien = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const fusion = { ...searchParams, ...params, page: params.page };
    for (const [cle, valeur] of Object.entries(fusion)) {
      if (valeur) query.set(cle, valeur);
    }
    const chaine = query.toString();
    return chaine ? `/actualites?${chaine}` : '/actualites';
  };

  /*
   * Le premier article de la première page occupe le grand encart.
   *
   * L'API remonte en tête les articles cochés « à la une » au back-office ;
   * à défaut, c'est la dernière parution qui s'y trouve. La rédaction
   * décide donc de l'encart sans que la page ait à chercher : si personne
   * ne coche rien, l'encart reste rempli au lieu de disparaître.
   *
   * Sur les pages suivantes ou sous filtre, tous les articles passent dans
   * la grille : mettre « à la une » le quatorzième article le plus récent
   * n'aurait aucun sens.
   */
  const aLaUne =
    page === 1 && !searchParams.recherche && !searchParams.categorie
      ? articles.items[0]
      : undefined;
  const suite = aLaUne ? articles.items.slice(1) : articles.items;

  const totalArticles = categories.reduce((somme, item) => somme + item.total, 0);

  return (
    <>
      {/* ─── Bannière sombre ──────────────────────────────────────────── */}
      <section className="bg-ablode-profond text-white">
        <div className="conteneur grid gap-8 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pb-20 lg:pt-16">
          <div>
            <p className="text-etiquette uppercase text-ablode-vert-clair">
              Journal de l’association
            </p>
            <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[3rem]">
              {t('titre')}
            </h1>
            <p className="mt-4 max-w-lg text-[1.0625rem] leading-relaxed text-white/70">
              {t('chapeau')}
            </p>
          </div>

          <div className="lg:justify-self-end">
            <RechercheArticles valeurInitiale={searchParams.recherche ?? ''} />
          </div>
        </div>
      </section>

      {/* Filtres, à cheval sur le bas de la bannière. */}
      <div className="relative z-10 -mt-7">
        <div className="conteneur">
          {/*
            Une seule rangée, qui se fait défiler au doigt sur téléphone.
            Avec `flex-wrap`, les cinq catégories s'empilaient sur trois
            lignes dans une boîte aux coins entièrement arrondis : le
            contour ovale enfermait un pavé, et le bloc mordait sur la
            bannière qu'il chevauche. Au-delà de `sm`, tout tient sur une
            ligne et la pilule reprend ses droits.
          */}
          <nav
            className="-mx-5 flex gap-1.5 overflow-x-auto rounded-carte border border-ablode-trait bg-white p-2 px-5 shadow-carte [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:inline-flex sm:max-w-full sm:flex-wrap sm:overflow-visible sm:rounded-full sm:px-2"
            aria-label="Catégories"
          >
            <Link
              href={construireLien({ categorie: undefined, page: undefined })}
              className={`puce-filtre shrink-0 !border-transparent ${
                !searchParams.categorie ? 'puce-filtre-active' : ''
              }`}
            >
              {t('toutes')} ({totalArticles})
            </Link>
            {categories.map((categorie) => (
              <Link
                key={categorie.categorie}
                href={construireLien({ categorie: categorie.categorie, page: undefined })}
                className={`puce-filtre shrink-0 !border-transparent ${
                  searchParams.categorie === categorie.categorie
                    ? 'puce-filtre-active'
                    : ''
                }`}
              >
                {LIBELLES_CATEGORIE[categorie.categorie]} ({categorie.total})
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="conteneur pb-16 pt-10">
        {articles.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-ablode-gris">
            {t('aucunResultat')}
          </p>
        ) : (
          <>
            {/* ─── Article à la une ────────────────────────────────── */}
            {aLaUne && (
              <Reveler>
                <Link
                  href={`/actualites/${aLaUne.slug}`}
                  className="group mb-6 grid overflow-hidden rounded-carte bg-ablode-profond transition-shadow duration-300 hover:shadow-relief lg:grid-cols-[1.1fr_1fr]"
                >
                  <div className="overflow-hidden">
                    <ImageArticle
                      src={aLaUne.image_url}
                      hauteur={340}
                      largeur={760}
                      className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  </div>

                  <div className="flex flex-col justify-center p-8 text-white sm:p-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-ablode-vert px-3 py-1 text-[0.75rem] font-semibold text-white">
                        {LIBELLES_CATEGORIE[aLaUne.categorie]}
                      </span>
                      <span className="text-[0.8125rem] text-white/60">
                        {date(aLaUne.date_publication)}
                      </span>
                      <span className="ml-auto text-[0.6875rem] uppercase tracking-[0.1em] text-white/45">
                        À la une
                      </span>
                    </div>

                    <h2 className="mt-5 text-[1.75rem] font-bold leading-tight tracking-[-0.025em] sm:text-[2rem]">
                      {aLaUne.titre}
                    </h2>
                    {aLaUne.extrait && (
                      <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/70">
                        {aLaUne.extrait}
                      </p>
                    )}

                    <span className="mt-7 text-[0.9375rem] font-semibold text-ablode-vert-clair">
                      {t('lireLaSuite')}{' '}
                      <span
                        aria-hidden
                        className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveler>
            )}

            {/* ─── Grille ──────────────────────────────────────────── */}
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suite.map((article, index) => (
                <Reveler as="li" key={article.id} delai={(index % 6) * 70}>
                  <Link
                    href={`/actualites/${article.slug}`}
                    className="carte-contenu group flex h-full flex-col hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0"
                  >
                    <div className="overflow-hidden border-b border-ablode-trait">
                      <ImageArticle
                        src={article.image_url}
                        hauteur={180}
                        largeur={520}
                        className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="pastille-categorie">
                          {LIBELLES_CATEGORIE[article.categorie]}
                        </span>
                        <span className="text-[0.8125rem] text-ablode-gris">
                          {date(article.date_publication)}
                        </span>
                      </div>

                      <h2 className="mt-4 text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] transition-colors group-hover:text-ablode-vert-sombre">
                        {article.titre}
                      </h2>
                      {article.extrait && (
                        <p className="mt-2.5 line-clamp-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                          {article.extrait}
                        </p>
                      )}

                      <p className="mt-auto flex items-center gap-2 pt-5 text-[0.875rem] font-semibold text-ablode-vert">
                        Lire
                        <span
                          aria-hidden
                          className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </p>
                    </div>
                  </Link>
                </Reveler>
              ))}
            </ul>
          </>
        )}

        {articles.pages > 1 && (
          <nav
            className="mt-10 flex items-center justify-between border-t border-ablode-trait pt-6"
            aria-label="Pagination"
          >
            {page > 1 ? (
              <Link
                href={construireLien({ page: String(page - 1) })}
                className="puce-filtre"
              >
                ← {tc('precedent')}
              </Link>
            ) : (
              <span />
            )}

            <span className="text-etiquette uppercase text-ablode-gris">
              {tc('page')} {page} {tc('sur')} {articles.pages}
            </span>

            {page < articles.pages ? (
              <Link
                href={construireLien({ page: String(page + 1) })}
                className="puce-filtre"
              >
                {tc('suivant')} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      {/* ─── Nos actions en vidéo ─────────────────────────────────────── */}
      <SectionVideos videos={videos} />

      {/* ─── Newsletter ───────────────────────────────────────────────── */}
      <section className="conteneur py-16">
        <Reveler>
          <div className="rounded-bloc bg-ablode-vert px-8 py-11 sm:px-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-white">{tNews('titre')}</h2>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/80">
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
