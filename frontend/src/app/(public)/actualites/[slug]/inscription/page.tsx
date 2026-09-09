import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { joursRestants } from '@/components/public/AppelInscription';
import { FormulaireMarche } from '@/components/public/FormulaireMarche';
import { apiPublic, apiPublicOuDefaut } from '@/lib/api';
import { dateHeure } from '@/lib/format';
import type { Article, FormulaireMarchePublic } from '@/lib/types';

async function charger(slug: string) {
  // Route publique par identifiant d'URL : `/articles/:id` est réservée au
  // back-office et répondrait 401.
  const article = await apiPublic<Article>(
    `/articles/slug/${encodeURIComponent(slug)}`,
  ).catch(() => null);
  if (!article) return null;

  const formulaire = await apiPublicOuDefaut<FormulaireMarchePublic | null>(
    `/marche/formulaire/${article.id}`,
    null,
  );
  return formulaire ? { article, formulaire } : null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const donnees = await charger(params.slug);
  if (!donnees) return { title: 'Inscription' };

  return {
    title: donnees.formulaire.titre,
    description: donnees.formulaire.introduction ?? undefined,
    /* Page de saisie : rien à indexer, tout est déjà dans l'article. */
    robots: { index: false, follow: true },
  };
}

/**
 * Page d'inscription à la marche.
 *
 * Une page pour une tâche. L'article raconte la marche et porte un bouton ;
 * ici on ne fait que remplir le bulletin.
 *
 * Elle n'existe que si un formulaire est publié sur l'article : sinon 404,
 * plutôt qu'une page vide accessible par une adresse devinée.
 */
export default async function PageInscriptionMarche({
  params,
}: {
  params: { slug: string };
}) {
  const donnees = await charger(params.slug);
  if (!donnees) notFound();

  const { article, formulaire } = donnees;
  const retour = `/actualites/${article.slug}`;

  return (
    <div className="conteneur py-12">
      <Link
        href={retour}
        className="text-[0.9375rem] font-medium text-ablode-gris hover:text-ablode-encre"
      >
        ← Retour à l’article
      </Link>

      <header className="mx-auto mt-8 max-w-lecture">
        <p className="etiquette">{article.titre}</p>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em]">
          {formulaire.titre}
        </h1>

        {formulaire.introduction && (
          <p className="mt-5 whitespace-pre-line text-[1.0625rem] leading-relaxed text-ablode-gris">
            {formulaire.introduction}
          </p>
        )}

        {/*
          L'échéance tient en une ligne. Un grand bandeau volait la vedette au
          formulaire alors qu'il n'est qu'une contrainte de calendrier.
        */}
        {formulaire.ouvert && formulaire.dateFermeture && (
          <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-ablode-vert-voile px-4 py-2 text-[0.875rem] font-semibold text-ablode-vert-sombre">
            Clôture le {dateHeure(formulaire.dateFermeture)}
            <span className="font-normal">· {joursRestants(formulaire.dateFermeture)}</span>
          </p>
        )}
      </header>

      <div className="mt-10">
        {formulaire.ouvert ? (
          <FormulaireMarche formulaire={formulaire} retour={retour} />
        ) : (
          <div className="mx-auto max-w-lecture rounded-bloc border border-ablode-trait bg-ablode-voile p-8 text-center">
            <p className="etiquette">Inscriptions closes</p>
            <p className="mt-3 text-[1.0625rem] leading-relaxed">
              {formulaire.messageFerme?.trim() ||
                'Les inscriptions à la marche sont terminées.'}
            </p>
            {formulaire.dateFermeture && (
              <p className="mt-2 text-[0.9375rem] text-ablode-gris">
                Clôturées le {dateHeure(formulaire.dateFermeture)}
              </p>
            )}
            <Link href={retour} className="bouton-secondaire mt-7">
              Revenir à l’article
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
