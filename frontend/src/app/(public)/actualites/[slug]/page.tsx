import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AppelInscription } from '@/components/public/AppelInscription';
import { FormulaireNewsletter } from '@/components/public/FormulaireNewsletter';
import { ImageArticle } from '@/components/public/ImageArticle';
import { BoutonsPartage } from './BoutonsPartage';
import { apiPublic, apiPublicOuDefaut } from '@/lib/api';
import { date, LIBELLES_CATEGORIE } from '@/lib/format';
import type { Article, FormulaireMarchePublic } from '@/lib/types';

export const revalidate = 300;

async function chargerArticle(slug: string): Promise<Article | null> {
  try {
    return await apiPublic<Article>(`/articles/slug/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await chargerArticle(params.slug);
  if (!article) return { title: 'Article introuvable' };

  return {
    title: article.meta_title ?? article.titre,
    description: article.meta_description ?? article.extrait ?? undefined,
    openGraph: {
      title: article.titre,
      description: article.extrait ?? undefined,
      type: 'article',
      publishedTime: article.date_publication ?? undefined,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function PageArticle({ params }: { params: { slug: string } }) {
  const t = await getTranslations('actualites');
  const tNews = await getTranslations('newsletter');

  const article = await chargerArticle(params.slug);
  if (!article) notFound();

  const autres = await apiPublicOuDefaut<Article[]>('/articles/recents', []);

  /*
   * Formulaire d'inscription éventuellement publié sur cet article. Il n'est
   * rendu que s'il existe et qu'il est publié ; l'API renvoie null sinon.
   */
  const formulaireMarche = await apiPublicOuDefaut<FormulaireMarchePublic | null>(
    `/marche/formulaire/${article.id}`,
    null,
  );
  const aLire = autres.filter((autre) => autre.id !== article.id).slice(0, 3);

  return (
    <article className="conteneur py-12">
      <Link
        href="/actualites"
        className="font-mono text-etiquette uppercase text-ablode-gris hover:text-ablode-encre"
      >
        ← {t('retour')}
      </Link>

      <header className="mx-auto mt-8 max-w-lecture">
        <p className="font-mono text-etiquette uppercase text-ablode-vert">
          {LIBELLES_CATEGORIE[article.categorie]}
        </p>
        <h1 className="mt-4 text-[2.25rem] font-bold leading-[1.15] tracking-[-0.025em]">
          {article.titre}
        </h1>
        <p className="mt-5 font-mono text-etiquette uppercase text-ablode-gris">
          {t('publieLe')} {date(article.date_publication)}
        </p>
      </header>

      {article.image_url && (
        <div className="mx-auto mt-10 w-full max-w-4xl">
          <ImageArticle
            src={article.image_url}
            hauteur={420}
            largeur={1200}
            priorite
          />
        </div>
      )}

      {/*
        Le HTML a déjà été assaini côté serveur par une liste blanche stricte
        (backend/src/modules/articles/sanitize-html.ts) avant stockage.
      */}
      <div
        className="article-contenu mx-auto mt-10 max-w-lecture"
        dangerouslySetInnerHTML={{ __html: article.contenu }}
      />

      {/* L'inscription se remplit sur sa propre page : ici, un appel. */}
      {formulaireMarche && (
        <AppelInscription formulaire={formulaireMarche} slug={article.slug} />
      )}

      <div className="mx-auto mt-12 max-w-lecture border-t border-ablode-trait pt-6">
        <BoutonsPartage titre={article.titre} />
      </div>

      <section className="mx-auto mt-12 max-w-lecture bg-ablode-voile p-8">
        <h2 className="text-lg font-bold">{tNews('titre')}</h2>
        <p className="mt-2 text-sm text-ablode-gris">{tNews('chapeau')}</p>
        <div className="mt-5">
          <FormulaireNewsletter variante="clair" />
        </div>
      </section>

      {aLire.length > 0 && (
        <section className="mt-16 border-t border-ablode-trait pt-10">
          <h2 className="titre-section">{t('aLire')}</h2>
          <ul className="mt-7 grid gap-px bg-ablode-trait sm:grid-cols-3">
            {aLire.map((autre) => (
              <li key={autre.id} className="bg-ablode-papier">
                <Link
                  href={`/actualites/${autre.slug}`}
                  className="group block h-full p-6 transition-colors hover:bg-white"
                >
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-vert">
                    {LIBELLES_CATEGORIE[autre.categorie]}
                  </p>
                  <h3 className="mt-2 text-base font-bold leading-snug group-hover:text-ablode-vert-sombre">
                    {autre.titre}
                  </h3>
                  <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-gris">
                    {date(autre.date_publication)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
