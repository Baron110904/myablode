import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FormulaireNewsletter } from '@/components/public/FormulaireNewsletter';
import { ImageArticle } from '@/components/public/ImageArticle';
import { Reveler } from '@/components/public/Reveler';
import { RechercheArticles } from './RechercheArticles';
import { apiPublicOuDefaut } from '@/lib/api';
import { date, LIBELLES_CATEGORIE } from '@/lib/format';
import type { Article, CategorieArticle, Paginated } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Actualités',
  description:
    'Campagnes de terrain, actions de sensibilisation et résultats de ' +
    'l’ABLODE, association béninoise de lutte contre le diabète et l’obésité.',
};

const VIDE: Paginated<Article> = { items: [], total: 0, page: 1, limit: 12, pages: 1 };

export const revalidate = 300;

export default async function PageActualites({
  searchParams,
}: {
  searchParams: { categorie?: string; recherche?: string; page?: string };
}) {
  const t = await getTranslations('actualites');
  const tc = await getTranslations('commun');
  const tNews = await getTranslations('newsletter');

  const page = Number(searchParams.page) || 1;
  const articles = await apiPublicOuDefaut<Paginated<Article>>('/articles/publies', VIDE, {
    params: {
      page,
      limit: 12,
      categorie: searchParams.categorie,
      recherche: searchParams.recherche,
    },
    // Une recherche ne doit pas être servie depuis un cache partagé.
    revalidate: searchParams.recherche ? 0 : 300,
  });

  const categories = await apiPublicOuDefaut<
    Array<{ categorie: CategorieArticle; total: number }>
  >('/articles/categories', []);

  const construireLien = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const fusion = { ...searchParams, ...params, page: params.page };
    for (const [cle, valeur] of Object.entries(fusion)) {
      if (valeur) query.set(cle, valeur);
    }
    const chaine = query.toString();
    return chaine ? `/actualites?${chaine}` : '/actualites';
  };

  return (
    <div className="conteneur py-12">
      <header className="max-w-2xl">
        <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
          {t('titre')}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ablode-gris">
          {t('chapeau')}
        </p>
      </header>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-b border-ablode-trait pb-5">
        <nav className="flex flex-wrap gap-1.5" aria-label="Catégories">
          <Link
            href={construireLien({ categorie: undefined, page: undefined })}
            className={`puce-filtre ${!searchParams.categorie ? 'puce-filtre-active' : ''}`}
          >
            {t('toutes')}
          </Link>
          {categories.map((categorie) => (
            <Link
              key={categorie.categorie}
              href={construireLien({ categorie: categorie.categorie, page: undefined })}
              className={`puce-filtre ${
                searchParams.categorie === categorie.categorie ? 'puce-filtre-active' : ''
              }`}
            >
              {LIBELLES_CATEGORIE[categorie.categorie]} ({categorie.total})
            </Link>
          ))}
        </nav>

        <RechercheArticles valeurInitiale={searchParams.recherche ?? ''} />
      </div>

      {articles.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ablode-gris">
          {t('aucunResultat')}
        </p>
      ) : (
        <ul className="mt-2 grid gap-px bg-ablode-trait sm:grid-cols-2 lg:grid-cols-3">
          {articles.items.map((article, index) => (
            <Reveler
              as="li"
              key={article.id}
              delai={(index % 6) * 70}
              className="bg-ablode-papier"
            >
              <Link
                href={`/actualites/${article.slug}`}
                className="group flex h-full flex-col p-7 transition-colors hover:bg-white"
              >
                <div className="mb-5 overflow-hidden">
                  <ImageArticle
                    src={article.image_url}
                    hauteur={160}
                    largeur={520}
                    className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  />
                </div>

                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-vert">
                  {LIBELLES_CATEGORIE[article.categorie]}
                </p>
                <h2 className="mt-2.5 text-lg font-bold leading-snug tracking-[-0.01em] transition-colors group-hover:text-ablode-vert-sombre">
                  {article.titre}
                </h2>
                {article.extrait && (
                  <p className="mt-2.5 line-clamp-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                    {article.extrait}
                  </p>
                )}
                <p className="mt-auto flex items-center gap-2 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-gris">
                  {date(article.date_publication)}
                  <span
                    aria-hidden
                    className="text-ablode-vert opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100"
                  >
                    →
                  </span>
                </p>
              </Link>
            </Reveler>
          ))}
        </ul>
      )}

      {articles.pages > 1 && (
        <nav
          className="mt-10 flex items-center justify-between border-t border-ablode-trait pt-6"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link href={construireLien({ page: String(page - 1) })} className="puce-filtre">
              ← {tc('precedent')}
            </Link>
          ) : (
            <span />
          )}

          <span className="font-mono text-etiquette uppercase text-ablode-gris">
            {tc('page')} {page} {tc('sur')} {articles.pages}
          </span>

          {page < articles.pages ? (
            <Link href={construireLien({ page: String(page + 1) })} className="puce-filtre">
              {tc('suivant')} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <section className="mt-16 bg-ablode-encre px-8 py-11 sm:px-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white">{tNews('titre')}</h2>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/70">
              {tNews('chapeau')}
            </p>
          </div>
          <FormulaireNewsletter variante="sombre" />
        </div>
      </section>
    </div>
  );
}
