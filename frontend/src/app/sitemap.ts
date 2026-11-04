import type { MetadataRoute } from 'next';
import { apiPublicOuDefaut } from '@/lib/api';
import type { Article, Paginated } from '@/lib/types';

/** Rafraîchi toutes les heures : un article publié est référençable le jour même. */
export const revalidate = 3600;

const VIDE: Paginated<Article> = { items: [], total: 0, page: 1, limit: 200, pages: 1 };

/**
 * Pages fixes du site, avec leur importance relative.
 *
 * `priority` n'est qu'une indication de hiérarchie interne : les moteurs la
 * lisent comme un classement entre nos propres pages, jamais comme une
 * demande de mieux classer le site.
 */
const PAGES_FIXES: Array<{
  chemin: string;
  priorite: number;
  frequence: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { chemin: '', priorite: 1, frequence: 'daily' },
  { chemin: '/carte', priorite: 0.9, frequence: 'daily' },
  { chemin: '/resultats', priorite: 0.9, frequence: 'daily' },
  { chemin: '/actualites', priorite: 0.8, frequence: 'daily' },
  { chemin: '/a-propos', priorite: 0.7, frequence: 'monthly' },
  { chemin: '/benevole', priorite: 0.6, frequence: 'monthly' },
  { chemin: '/contact', priorite: 0.6, frequence: 'monthly' },
  { chemin: '/mentions-legales', priorite: 0.3, frequence: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const maintenant = new Date();

  /*
   * Les articles sont tirés de l'API. Si elle est injoignable, le plan se
   * réduit aux pages fixes plutôt que d'échouer : un sitemap partiel vaut
   * mieux qu'une erreur 500 servie au robot d'indexation.
   */
  const articles = await apiPublicOuDefaut<Paginated<Article>>(
    '/articles/publies',
    VIDE,
    { params: { limit: 200 }, revalidate: 3600 },
  );

  return [
    ...PAGES_FIXES.map(({ chemin, priorite, frequence }) => ({
      url: `${site}${chemin}`,
      lastModified: maintenant,
      changeFrequency: frequence,
      priority: priorite,
    })),
    ...articles.items.map((article) => ({
      url: `${site}/actualites/${article.slug}`,
      lastModified: new Date(article.date_publication ?? article.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
